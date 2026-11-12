import type { BillingPayment as BillingPaymentRow, Subscription as SubscriptionRow } from '../../../generated/prisma/client.js';
import type { BillingInterval, PaymentStatus, SubscriptionStatus } from '../domain/billing.types.js';
import type { BillingPayment, PaymentWithSubscription } from '../domain/billing-payment.js';
import type { Subscription } from '../domain/subscription.js';

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    ...row,
    status: row.status as SubscriptionStatus,
    interval: row.interval as BillingInterval,
  };
}

export function toSubscriptionOrNull(row: SubscriptionRow | null): Subscription | null {
  return row ? toSubscription(row) : null;
}

export function toPaymentStatus(status: string): PaymentStatus {
  return status as PaymentStatus;
}

export function toPayment(row: BillingPaymentRow): BillingPayment {
  return { ...row, status: toPaymentStatus(row.status) };
}

export function toPaymentWithSubscription(row: BillingPaymentRow & { subscription: SubscriptionRow }): PaymentWithSubscription {
  const { subscription, ...payment } = row;
  return { ...toPayment(payment), subscription: toSubscription(subscription) };
}
