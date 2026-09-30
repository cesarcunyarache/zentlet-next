import type { PaymentStatus, SubscriptionStatus } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const LIVE_STATUSES = [
  "pending",
  "trialing",
  "active",
  "past_due",
] as const satisfies readonly SubscriptionStatus[];
export const CHECKOUT_REUSE_MS = DAY_MS;

export function isLive(status: SubscriptionStatus) {
  return (LIVE_STATUSES as readonly SubscriptionStatus[]).includes(status);
}

interface StatusInput {
  providerStatus: SubscriptionStatus;
  lastPaymentStatus: PaymentStatus | null;
  trialEndsAt: Date | null;
  now: Date;
}

export function resolveStatus({
  providerStatus,
  lastPaymentStatus,
  trialEndsAt,
  now,
}: StatusInput): SubscriptionStatus {
  if (providerStatus !== "active") return providerStatus;
  if (lastPaymentStatus === "failed") return "past_due";
  if (lastPaymentStatus === null && trialEndsAt && now < trialEndsAt) return "trialing";
  return "active";
}

export function isTrialEligible(history: { status: SubscriptionStatus; trialEndsAt: Date | null }[]) {
  return history.every((subscription) => subscription.trialEndsAt === null || subscription.status === "pending");
}

export function firstChargeDate({
  now,
  trialDays,
  paidUntil,
}: {
  now: Date;
  trialDays: number;
  paidUntil: Date | null;
}) {
  const trialEnd = new Date(now.getTime() + trialDays * DAY_MS);
  return paidUntil && paidUntil > trialEnd ? paidUntil : trialEnd;
}

export function canReuseCheckout(subscription: { checkoutUrl: string | null; createdAt: Date }, now: Date) {
  return subscription.checkoutUrl !== null && now.getTime() - subscription.createdAt.getTime() < CHECKOUT_REUSE_MS;
}
