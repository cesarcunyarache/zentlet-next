import { Injectable } from '@nestjs/common';
import { BillingProviderRegistry } from '../../../domain/billing-provider-registry.js';
import { BillingEventRepository } from '../../../domain/billing-event.repository.js';
import { BillingPaymentRepository } from '../../../domain/billing-payment.repository.js';
import type { PaymentStatus } from '../../../domain/billing.types.js';
import { refundableAmount, refundedStatus } from '../../rules/refund.rules.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import type { RefundPaymentInput } from './refund-payment.input.js';

const REFUNDABLE_STATUSES: PaymentStatus[] = ['approved', 'partially_refunded'];

export type RefundOutcome =
  | { kind: 'refunded'; amount: number; status: PaymentStatus }
  | { kind: 'not_found' }
  | { kind: 'not_refundable' }
  | { kind: 'conflict' };

@Injectable()
export class RefundPaymentUseCase {
  constructor(
    private readonly billingPaymentRepository: BillingPaymentRepository,
    private readonly billingProviderRegistry: BillingProviderRegistry,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
  ) {}

  async execute({ paymentId, mode, revokeAccess }: RefundPaymentInput, now = new Date()): Promise<RefundOutcome> {
    const payment = await this.billingPaymentRepository.findWithSubscription(paymentId);
    if (!payment) return { kind: 'not_found' };

    const { providerPaymentId } = payment;
    const isRefundableStatus = REFUNDABLE_STATUSES.includes(payment.status);
    if (!providerPaymentId || !isRefundableStatus) return { kind: 'not_refundable' };

    const amount = refundableAmount(payment, mode, payment.subscription.interval, now);
    if (amount <= 0) return { kind: 'not_refundable' };

    await this.billingProviderRegistry.get(payment.provider).refundPayment({
      providerPaymentId,
      amount,
      // Reusing the same key on a retry (same payment, same prior refunded
      // amount) tells Mercado Pago it's the same request, not a double refund.
      idempotencyKey: `refund:${payment.id}:${payment.refundedAmount}`,
    });

    const refundedAmount = payment.refundedAmount + amount;
    const status = refundedStatus(payment.amount, refundedAmount);
    const recorded = await this.billingPaymentRepository.recordRefund(payment.id, {
      previousRefundedAmount: payment.refundedAmount,
      refundedAmount,
      status,
    });
    if (recorded === 'conflict') return { kind: 'conflict' };

    if (revokeAccess) {
      await this.subscriptionLifecycle.cancel(payment.subscription, { source: 'admin', immediate: true, now });
    }
    await this.billingEventRepository.record({
      source: 'admin',
      type: 'payment.refunded',
      userId: payment.subscription.userId,
      subscriptionId: payment.subscriptionId,
      data: { paymentId: payment.id, amount, mode, revokeAccess },
    });

    return { kind: 'refunded', amount, status };
  }
}
