import type { BillingPayment as PaymentRow, Subscription as SubscriptionRow } from "@/generated/prisma/client";
import type { BillingInterval, PaymentStatus, SubscriptionStatus } from "../../../../types";
import type { Payment, PaymentWithSubscription } from "../../../domain/entities/payment.entity";
import type { Subscription } from "../../../domain/entities/subscription.entity";

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    ...row,
    status: row.status as SubscriptionStatus,
    interval: row.interval as BillingInterval,
  };
}

export function toSubscriptionOrNull(row: SubscriptionRow | null) {
  if (!row) return null;
  return toSubscription(row);
}

export function toPaymentStatus(status: string) {
  return status as PaymentStatus;
}

export function toPayment(row: PaymentRow): Payment {
  return { ...row, status: toPaymentStatus(row.status) };
}

export function toPaymentWithSubscription(row: PaymentRow & { subscription: SubscriptionRow }): PaymentWithSubscription {
  const { subscription, ...payment } = row;
  return { ...toPayment(payment), subscription: toSubscription(subscription) };
}
