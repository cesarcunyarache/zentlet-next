import { Injectable } from '@nestjs/common';
import type { PaymentStatus } from '../domain/billing.types.js';
import { BillingPaymentRepository } from '../domain/billing-payment.repository.js';
import type { BillingPayment, PaymentRecord, PaymentWithSubscription, Refund } from '../domain/entities/billing-payment.js';
import type { Subscription } from '../domain/entities/subscription.js';

@Injectable()
export class InMemoryBillingPaymentRepository extends BillingPaymentRepository {
  private readonly payments = new Map<string, BillingPayment>();
  private readonly subscriptions = new Map<string, Subscription>();

  // Lets tests register the subscriptions this fake should resolve for findWithSubscription.
  registerSubscription(subscription: Subscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  // Lets tests seed a payment row directly instead of going through upsert.
  seed(payment: BillingPayment): void {
    this.payments.set(payment.id, payment);
  }

  async findStatus(provider: string, externalId: string): Promise<PaymentStatus | null> {
    const payment = this.findByProviderId(provider, externalId);
    return payment?.status ?? null;
  }

  async findLatestStatus(subscriptionId: string): Promise<PaymentStatus | null> {
    const latest = [...this.payments.values()]
      .filter((payment) => payment.subscriptionId === subscriptionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return latest?.status ?? null;
  }

  async findWithSubscription(id: string): Promise<PaymentWithSubscription | null> {
    const payment = this.payments.get(id);
    if (!payment) return null;
    const subscription = this.subscriptions.get(payment.subscriptionId);
    if (!subscription) return null;
    return { ...payment, subscription };
  }

  async upsert(payment: PaymentRecord): Promise<void> {
    const existing = this.findByProviderId(payment.provider, payment.externalId);
    const now = new Date();
    const updated: BillingPayment = existing
      ? { ...existing, status: payment.status, providerPaymentId: payment.providerPaymentId, paidAt: payment.paidAt, updatedAt: now }
      : { ...payment, id: crypto.randomUUID(), refundedAmount: 0, createdAt: now, updatedAt: now };
    this.payments.set(updated.id, updated);
  }

  async recordRefund(id: string, { previousRefundedAmount, refundedAmount, status }: Refund): Promise<'recorded' | 'conflict'> {
    const existing = this.payments.get(id);
    if (!existing || existing.refundedAmount !== previousRefundedAmount) return 'conflict';
    this.payments.set(id, { ...existing, refundedAmount, status, updatedAt: new Date() });
    return 'recorded';
  }

  private findByProviderId(provider: string, externalId: string): BillingPayment | undefined {
    return [...this.payments.values()].find(
      (payment) => payment.provider === provider && payment.externalId === externalId,
    );
  }
}
