import { isUniqueViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import { grantsAccess } from "../lib/entitlements";
import { canReuseCheckout, firstChargeDate, isTrialEligible } from "../lib/lifecycle";
import { PLANS, planPrice, TRIAL_DAYS, type PaidPlanKey } from "../lib/plans";
import { getBillingProvider } from "../providers";
import { recordBillingEvent } from "./events";
import { abandonPending, listUserSubscriptions, type SubscriptionRow } from "./subscriptions";

interface CheckoutRequest {
  userId: string;
  email: string;
  planKey: PaidPlanKey;
  returnUrl: string;
}

export type CheckoutOutcome =
  | { kind: "redirect"; checkoutUrl: string }
  | { kind: "already_subscribed" }
  | { kind: "in_progress" };

function paidUntil(history: SubscriptionRow[], now: Date) {
  const canceled = history.find((subscription) => subscription.status === "canceled" && grantsAccess(subscription, now));
  return canceled?.currentPeriodEnd ?? null;
}

async function reuseOrAbandon(live: SubscriptionRow, now: Date): Promise<CheckoutOutcome | null> {
  if (live.status !== "pending") return { kind: "already_subscribed" };
  if (!live.checkoutUrl) return { kind: "in_progress" };
  if (canReuseCheckout(live, now)) return { kind: "redirect", checkoutUrl: live.checkoutUrl };
  await abandonPending(live, now);
  return null;
}

async function createPendingRow(request: CheckoutRequest, history: SubscriptionRow[], now: Date) {
  const price = planPrice(request.planKey);
  const trialDays = isTrialEligible(history) ? TRIAL_DAYS : 0;
  const firstChargeAt = firstChargeDate({ now, trialDays, paidUntil: paidUntil(history, now) });
  const row = await prisma.subscription.create({
    data: {
      userId: request.userId,
      planKey: request.planKey,
      status: "pending",
      amount: price.amount,
      currency: price.currency,
      interval: price.interval,
      provider: getBillingProvider().name,
      trialEndsAt: trialDays > 0 ? firstChargeAt : null,
    },
  });
  return { row: row as SubscriptionRow, firstChargeAt };
}

async function openProviderCheckout(request: CheckoutRequest, row: SubscriptionRow, firstChargeAt: Date) {
  try {
    const { externalId, checkoutUrl } = await getBillingProvider(row.provider).createCheckout({
      subscriptionId: row.id,
      reason: `Zentlet ${PLANS[request.planKey].name}`,
      payerEmail: request.email,
      amount: row.amount,
      currency: row.currency,
      interval: planPrice(request.planKey).interval,
      firstChargeAt,
      returnUrl: request.returnUrl,
    });
    await prisma.subscription.update({ where: { id: row.id }, data: { externalId, checkoutUrl } });
    return checkoutUrl;
  } catch (error) {
    await abandonPending(row);
    throw error;
  }
}

export async function startCheckout(request: CheckoutRequest, now = new Date()): Promise<CheckoutOutcome> {
  const history = await listUserSubscriptions(request.userId);
  const live = history.find((subscription) => subscription.status !== "canceled");
  if (live) {
    const outcome = await reuseOrAbandon(live, now);
    if (outcome) return outcome;
  }

  try {
    const { row, firstChargeAt } = await createPendingRow(request, history, now);
    const checkoutUrl = await openProviderCheckout(request, row, firstChargeAt);
    await recordBillingEvent({
      source: "user",
      type: "checkout.started",
      userId: request.userId,
      subscriptionId: row.id,
      data: { planKey: request.planKey, trial: row.trialEndsAt !== null },
    });
    return { kind: "redirect", checkoutUrl };
  } catch (error) {
    if (isUniqueViolation(error)) return { kind: "in_progress" };
    throw error;
  }
}
