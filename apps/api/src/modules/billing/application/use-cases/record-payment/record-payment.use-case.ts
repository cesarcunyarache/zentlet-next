import { Injectable } from '@nestjs/common';
import { BillingProviderRegistry } from '../../../domain/billing-provider-registry.js';
import type { PaymentSnapshot } from '../../../domain/billing-provider.js';
import { BillingPaymentRepository } from '../../../domain/billing-payment.repository.js';
import type { PaymentStatus } from '../../../domain/billing.types.js';
import { SubscriptionRepository } from '../../../domain/subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';

const LOCAL_REFUND_STATUSES: PaymentStatus[] = ['refunded', 'partially_refunded'];

// If we already recorded a refund locally, a stale "approved" snapshot from
// the provider (webhook re-delivery, out-of-order sync) must not overwrite it.
function resolvePaymentStatus(current: PaymentStatus | null, incoming: PaymentStatus): PaymentStatus {
  const refundedLocally = current !== null && LOCAL_REFUND_STATUSES.includes(current);
  const providerStillApproved = incoming === 'approved';
  if (refundedLocally && providerStillApproved) return current;
  return incoming;
}

@Injectable()
export class RecordPaymentUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly billingPaymentRepository: BillingPaymentRepository,
    private readonly billingProviderRegistry: BillingProviderRegistry,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
  ) {}

  async execute(providerName: string, snapshot: PaymentSnapshot) {
    const subscription = await this.subscriptionRepository.findByExternalId(
      providerName,
      snapshot.subscriptionExternalId,
    );
    if (!subscription) return null;

    const currentStatus = await this.billingPaymentRepository.findStatus(providerName, snapshot.externalId);
    await this.billingPaymentRepository.upsert({
      subscriptionId: subscription.id,
      provider: providerName,
      externalId: snapshot.externalId,
      providerPaymentId: snapshot.providerPaymentId,
      status: resolvePaymentStatus(currentStatus, snapshot.status),
      amount: snapshot.amount,
      currency: snapshot.currency,
      paidAt: snapshot.paidAt,
    });

    if (subscription.externalId) {
      const provider = this.billingProviderRegistry.get(providerName);
      const subscriptionSnapshot = await provider.getSubscription(subscription.externalId);
      await this.subscriptionLifecycle.applySnapshot(subscription, subscriptionSnapshot);
    }

    return subscription;
  }
}
