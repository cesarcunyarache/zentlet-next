import type { Subscription } from "@/generated/prisma/client";
import type { BillingInterval, PaymentStatus, SubscriptionStatus } from "../types";

export type SubscriptionRow = Subscription & { status: SubscriptionStatus };

export function toSubscriptionRow(row: Subscription): SubscriptionRow {
  return row as SubscriptionRow;
}

export function toSubscriptionRowOrNull(row: Subscription | null) {
  if (!row) return null;
  return toSubscriptionRow(row);
}

export function toPaymentStatus(status: string): PaymentStatus {
  return status as PaymentStatus;
}

export function toBillingInterval(interval: string): BillingInterval {
  return interval as BillingInterval;
}
