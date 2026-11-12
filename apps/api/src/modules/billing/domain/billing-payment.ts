import type { PaymentStatus } from './billing.types.js';
import type { Subscription } from './subscription.js';

export type BillingPayment = {
  id: string;
  subscriptionId: string;
  provider: string;
  externalId: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentWithSubscription = BillingPayment & { subscription: Subscription };

export type PaymentRecord = Pick<
  BillingPayment,
  'subscriptionId' | 'provider' | 'externalId' | 'providerPaymentId' | 'status' | 'amount' | 'currency' | 'paidAt'
>;

export type Refund = {
  previousRefundedAmount: number;
  refundedAmount: number;
  status: PaymentStatus;
};
