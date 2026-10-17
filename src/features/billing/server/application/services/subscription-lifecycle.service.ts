import { resolveStatus } from "../../../lib/lifecycle";
import type { SubscriptionSnapshot } from "../../../providers/types";
import type { BillingEventSource } from "../../../types";
import type { Subscription } from "../../domain/entities/subscription.entity";
import type { BillingProviders, PlanCache } from "../../domain/ports/billing.ports";
import type { BillingEventRepository } from "../../domain/repositories/billing-event.repository";
import type { PaymentRepository } from "../../domain/repositories/payment.repository";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";

interface CancelOptions {
  source: BillingEventSource;
  immediate?: boolean;
  now?: Date;
}

export class SubscriptionLifecycle {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly billingProviders: BillingProviders,
    private readonly planCache: PlanCache,
  ) {}

  async applySnapshot(subscription: Subscription, snapshot: SubscriptionSnapshot, now = new Date()) {
    const status = resolveStatus({
      providerStatus: snapshot.status,
      lastPaymentStatus: await this.paymentRepository.findLatestStatus(subscription.id),
      trialEndsAt: subscription.trialEndsAt,
      now,
    });
    const isNewlyCanceled = status === "canceled" && subscription.status !== "canceled";

    const updated = await this.subscriptionRepository.applyProviderState(subscription.id, {
      status,
      externalId: snapshot.externalId,
      currentPeriodEnd: snapshot.currentPeriodEnd ?? subscription.currentPeriodEnd,
      canceledAt: isNewlyCanceled ? now : subscription.canceledAt,
    });
    await this.planCache.forget(subscription.userId);

    if (status !== subscription.status) {
      await this.billingEventRepository.record({
        source: "system",
        type: "subscription.status_changed",
        userId: subscription.userId,
        subscriptionId: subscription.id,
        data: { from: subscription.status, to: status },
      });
    }

    return updated;
  }

  async sync(subscription: Subscription) {
    if (!subscription.externalId) return subscription;

    const provider = this.billingProviders.get(subscription.provider);
    const snapshot = await provider.getSubscription(subscription.externalId);
    return this.applySnapshot(subscription, snapshot);
  }

  async abandonPending(subscription: Subscription, now = new Date()) {
    await this.subscriptionRepository.markAbandoned(subscription.id, now);
    await this.planCache.forget(subscription.userId);
    await this.billingEventRepository.record({
      source: "system",
      type: "checkout.abandoned",
      userId: subscription.userId,
      subscriptionId: subscription.id,
    });
  }

  async cancel(subscription: Subscription, { source, immediate = false, now = new Date() }: CancelOptions) {
    const { externalId } = subscription;
    const isOpenAtProvider = subscription.status !== "canceled";
    if (externalId && isOpenAtProvider) {
      await this.billingProviders.get(subscription.provider).cancelSubscription(externalId);
    }

    if (subscription.status === "pending") return this.abandonPending(subscription, now);

    const paidAccessEnd = subscription.currentPeriodEnd ?? subscription.trialEndsAt;
    const accessUntil = immediate ? now : paidAccessEnd;

    await this.subscriptionRepository.markCanceled(subscription.id, {
      canceledAt: subscription.canceledAt ?? now,
      accessUntil,
    });
    await this.planCache.forget(subscription.userId);
    await this.billingEventRepository.record({
      source,
      type: "subscription.canceled",
      userId: subscription.userId,
      subscriptionId: subscription.id,
      data: { from: subscription.status, immediate, accessUntil: accessUntil?.toISOString() ?? null },
    });
  }
}
