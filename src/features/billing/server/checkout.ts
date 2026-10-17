import { isUniqueViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import { grantsAccess } from "../lib/entitlements";
import { canReuseCheckout, firstChargeDate, isTrialEligible } from "../lib/lifecycle";
import { PLANS, planPrice, TRIAL_DAYS, type PaidPlanKey } from "../lib/plans";
import { getBillingProvider } from "../providers";
import { recordBillingEvent } from "./events";
import { toSubscriptionRow, type SubscriptionRow } from "./rows";
import { abandonPending, listUserSubscriptions } from "./subscriptions";

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

async function resolveLiveSubscription(live: SubscriptionRow, now: Date): Promise<CheckoutOutcome | "abandoned"> {
  if (live.status !== "pending") return { kind: "already_subscribed" };
  if (!live.checkoutUrl) return { kind: "in_progress" };
  if (canReuseCheckout(live, now)) return { kind: "redirect", checkoutUrl: live.checkoutUrl };

  await abandonPending(live, now);
  return "abandoned";
}

async function createPendingSubscription(request: CheckoutRequest, history: SubscriptionRow[], now: Date) {
  const price = planPrice(request.planKey);
  const trialDays = isTrialEligible(history) ? TRIAL_DAYS : 0;
  const firstChargeAt = firstChargeDate({ now, trialDays, paidUntil: paidUntil(history, now) });

  try {
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
    return { subscription: toSubscriptionRow(row), firstChargeAt };
  } catch (error) {
    const anotherCheckoutIsLive = isUniqueViolation(error);
    if (anotherCheckoutIsLive) return "in_progress" as const;
    throw error;
  }
}

async function openProviderCheckout(request: CheckoutRequest, subscription: SubscriptionRow, firstChargeAt: Date) {
  try {
    const { externalId, checkoutUrl } = await getBillingProvider(subscription.provider).createCheckout({
      subscriptionId: subscription.id,
      reason: `Zentlet ${PLANS[request.planKey].name}`,
      payerEmail: request.email,
      amount: subscription.amount,
      currency: subscription.currency,
      interval: planPrice(request.planKey).interval,
      firstChargeAt,
      returnUrl: request.returnUrl,
    });
    await prisma.subscription.update({ where: { id: subscription.id }, data: { externalId, checkoutUrl } });
    return checkoutUrl;
  } catch (error) {
    await abandonPending(subscription);
    throw error;
  }
}

export async function startCheckout(request: CheckoutRequest, now = new Date()): Promise<CheckoutOutcome> {
  const history = await listUserSubscriptions(request.userId);

  const live = history.find((subscription) => subscription.status !== "canceled");
  if (live) {
    const resolution = await resolveLiveSubscription(live, now);
    if (resolution !== "abandoned") return resolution;
  }

  const pending = await createPendingSubscription(request, history, now);
  if (pending === "in_progress") return { kind: "in_progress" };

  const checkoutUrl = await openProviderCheckout(request, pending.subscription, pending.firstChargeAt);
  await recordBillingEvent({
    source: "user",
    type: "checkout.started",
    userId: request.userId,
    subscriptionId: pending.subscription.id,
    data: { planKey: request.planKey, trial: pending.subscription.trialEndsAt !== null },
  });

  return { kind: "redirect", checkoutUrl };
}
