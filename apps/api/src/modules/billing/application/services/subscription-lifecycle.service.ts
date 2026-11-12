import { Injectable } from '@nestjs/common';
import type { BillingEventSource } from '../../domain/billing.types.js';
import { BillingProviderRegistry } from '../../domain/billing-provider-registry.js';
import type { SubscriptionSnapshot } from '../../domain/billing-provider.js';
import { BillingEventRepository } from '../../domain/billing-event.repository.js';
import type { Subscription } from '../../domain/subscription.js';
import { SubscriptionRepository } from '../../domain/subscription.repository.js';
import { resolveStatus } from '../rules/subscription-lifecycle.rules.js';
import { BillingPaymentRepository } from '../../domain/billing-payment.repository.js';

export type CancelOptions = {
  source: BillingEventSource;
  immediate?: boolean;
  now?: Date;
};

@Injectable()
export class SubscriptionLifecycleService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly billingPaymentRepository: BillingPaymentRepository,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly billingProviderRegistry: BillingProviderRegistry,
  ) {}

  async applySnapshot(subscription: Subscription, snapshot: SubscriptionSnapshot, now = new Date()): Promise<Subscription> {
    const status = resolveStatus({
      providerStatus: snapshot.status,
      lastPaymentStatus: await this.billingPaymentRepository.findLatestStatus(subscription.id),
      trialEndsAt: subscription.trialEndsAt,
      now,
    });
    const isNewlyCanceled = status === 'canceled' && subscription.status !== 'canceled';

    const updated = await this.subscriptionRepository.applyProviderState(subscription.id, {
      status,
      externalId: snapshot.externalId,
      currentPeriodEnd: snapshot.currentPeriodEnd ?? subscription.currentPeriodEnd,
      canceledAt: isNewlyCanceled ? now : subscription.canceledAt,
    });

    if (status !== subscription.status) {
      await this.billingEventRepository.record({
        source: 'system',
        type: 'subscription.status_changed',
        userId: subscription.userId,
        subscriptionId: subscription.id,
        data: { from: subscription.status, to: status },
      });
    }

    return updated;
  }

  async sync(subscription: Subscription): Promise<Subscription> {
    if (!subscription.externalId) return subscription;

    const provider = this.billingProviderRegistry.get(subscription.provider);
    const snapshot = await provider.getSubscription(subscription.externalId);
    return this.applySnapshot(subscription, snapshot);
  }

  async abandonPending(subscription: Subscription, now = new Date()): Promise<void> {
    await this.subscriptionRepository.markAbandoned(subscription.id, now);
    await this.billingEventRepository.record({
      source: 'system',
      type: 'checkout.abandoned',
      userId: subscription.userId,
      subscriptionId: subscription.id,
    });
  }

  async cancel(subscription: Subscription, { source, immediate = false, now = new Date() }: CancelOptions): Promise<void> {
    const { externalId } = subscription;
    const isOpenAtProvider = subscription.status !== 'canceled';
    if (externalId && isOpenAtProvider) {
      await this.billingProviderRegistry.get(subscription.provider).cancelSubscription(externalId);
    }

    if (subscription.status === 'pending') {
      await this.abandonPending(subscription, now);
      return;
    }

    const paidAccessEnd = subscription.currentPeriodEnd ?? subscription.trialEndsAt;
    const accessUntil = immediate ? now : paidAccessEnd;

    await this.subscriptionRepository.markCanceled(subscription.id, {
      canceledAt: subscription.canceledAt ?? now,
      accessUntil,
    });
    await this.billingEventRepository.record({
      source,
      type: 'subscription.canceled',
      userId: subscription.userId,
      subscriptionId: subscription.id,
      data: { from: subscription.status, immediate, accessUntil: accessUntil?.toISOString() ?? null },
    });
  }
}
