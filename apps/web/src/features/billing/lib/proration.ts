import type { BillingInterval } from "../types";

export type RefundMode = "full" | "prorated";

export function periodEnd(start: Date, interval: BillingInterval) {
  const end = new Date(start);
  if (interval === "month") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

export function unusedAmount({ amount, start, end, now }: { amount: number; start: Date; end: Date; now: Date }) {
  const total = end.getTime() - start.getTime();
  if (total <= 0 || now >= end) return 0;
  if (now <= start) return amount;
  return Math.floor((amount * (end.getTime() - now.getTime())) / total);
}

interface RefundablePayment {
  amount: number;
  refundedAmount: number;
  paidAt: Date | null;
}

export function refundableAmount(payment: RefundablePayment, mode: RefundMode, interval: BillingInterval, now: Date) {
  const remaining = payment.amount - payment.refundedAmount;
  if (mode === "full" || !payment.paidAt) return remaining;
  const unused = unusedAmount({
    amount: payment.amount,
    start: payment.paidAt,
    end: periodEnd(payment.paidAt, interval),
    now,
  });
  return Math.min(unused, remaining);
}

export function refundedStatus(amount: number, refundedAmount: number) {
  return refundedAmount >= amount ? "refunded" : "partially_refunded";
}
