import { grantsAccess } from "../../../lib/entitlements";
import { canReuseCheckout, firstChargeDate, isTrialEligible } from "../../../lib/lifecycle";
import { PLANS, planPrice, TRIAL_DAYS, type PaidPlanKey } from "../../../lib/plans";
import { SUBSCRIPTION_HISTORY_LIMIT, type Subscription } from "../../domain/entities/subscription.entity";
import type { BillingProviders } from "../../domain/ports/billing.ports";
import type { BillingEventRepository } from "../../domain/repositories/billing-event.repository";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { SubscriptionLifecycle } from "../services/subscription-lifecycle.service";

export interface CheckoutRequest {
  email: string;
  planKey: PaidPlanKey;
  returnUrl: string;
}

export type CheckoutOutcome =
  | { kind: "redirect"; checkoutUrl: string }
  | { kind: "already_subscribed" }
  | { kind: "in_progress" };

function paidUntil(history: Subscription[], now: Date) {
  const canceled = history.find((subscription) => subscription.status === "canceled" && grantsAccess(subscription, now));
  return canceled?.currentPeriodEnd ?? null;
}

export class StartCheckoutUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly billingProviders: BillingProviders,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycle,
  ) {}

  async execute(userId: string, request: CheckoutRequest, now = new Date()): Promise<CheckoutOutcome> {
    const history = await this.subscriptionRepository.findHistory(userId, SUBSCRIPTION_HISTORY_LIMIT);

    const live = history.find((subscription) => subscription.status !== "canceled");
    if (live) {
      const resolution = await this.resolveLiveSubscription(live, now);
      if (resolution !== "abandoned") return resolution;
    }

    const price = planPrice(request.planKey);
    const trialDays = isTrialEligible(history) ? TRIAL_DAYS : 0;
    const firstChargeAt = firstChargeDate({ now, trialDays, paidUntil: paidUntil(history, now) });

    const pending = await this.subscriptionRepository.createPending({
      userId,
      planKey: request.planKey,
      amount: price.amount,
      currency: price.currency,
      interval: price.interval,
      provider: this.billingProviders.current().name,
      trialEndsAt: trialDays > 0 ? firstChargeAt : null,
    });
    if (pending === "live_exists") return { kind: "in_progress" };

    const checkoutUrl = await this.openProviderCheckout(pending, request, firstChargeAt);
    await this.billingEventRepository.record({
      source: "user",
      type: "checkout.started",
      userId,
      subscriptionId: pending.id,
      data: { planKey: request.planKey, trial: pending.trialEndsAt !== null },
    });

    return { kind: "redirect", checkoutUrl };
  }

  private async resolveLiveSubscription(live: Subscription, now: Date): Promise<CheckoutOutcome | "abandoned"> {
    if (live.status !== "pending") return { kind: "already_subscribed" };
    if (!live.checkoutUrl) return { kind: "in_progress" };
    if (canReuseCheckout(live, now)) return { kind: "redirect", checkoutUrl: live.checkoutUrl };

    await this.subscriptionLifecycle.abandonPending(live, now);
    return "abandoned";
  }

  private async openProviderCheckout(pending: Subscription, request: CheckoutRequest, firstChargeAt: Date) {
    try {
      const { externalId, checkoutUrl } = await this.billingProviders.get(pending.provider).createCheckout({
        subscriptionId: pending.id,
        reason: `Zentlet ${PLANS[request.planKey].name}`,
        payerEmail: request.email,
        amount: pending.amount,
        currency: pending.currency,
        interval: planPrice(request.planKey).interval,
        firstChargeAt,
        returnUrl: request.returnUrl,
      });
      await this.subscriptionRepository.attachCheckout(pending.id, externalId, checkoutUrl);
      return checkoutUrl;
    } catch (error) {
      await this.subscriptionLifecycle.abandonPending(pending);
      throw error;
    }
  }
}
