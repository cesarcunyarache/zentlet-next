import type { PaymentStatus } from './billing.types.js';
import type { PaymentRecord, PaymentWithSubscription, Refund } from './billing-payment.js';

export abstract class BillingPaymentRepository {
  abstract findStatus(provider: string, externalId: string): Promise<PaymentStatus | null>;

  abstract findLatestStatus(subscriptionId: string): Promise<PaymentStatus | null>;

  abstract findWithSubscription(id: string): Promise<PaymentWithSubscription | null>;

  abstract upsert(payment: PaymentRecord): Promise<void>;

  abstract recordRefund(id: string, refund: Refund): Promise<'recorded' | 'conflict'>;
}
