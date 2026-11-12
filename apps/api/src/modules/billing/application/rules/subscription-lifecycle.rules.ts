import type { PaymentStatus, SubscriptionStatus } from '../../domain/billing.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Free-trial length, in days. A billing policy (docs/payments.md §6), not a
// plan-catalog detail, so it lives here rather than behind a plans module.
export const TRIAL_DAYS = 15;

export const LIVE_STATUSES = ['pending', 'trialing', 'active', 'past_due'] as const satisfies readonly SubscriptionStatus[];
export const CHECKOUT_REUSE_MS = DAY_MS;

export function isLive(status: SubscriptionStatus): boolean {
  return (LIVE_STATUSES as readonly SubscriptionStatus[]).includes(status);
}

export type ResolveStatusInput = {
  providerStatus: SubscriptionStatus;
  lastPaymentStatus: PaymentStatus | null;
  trialEndsAt: Date | null;
  now: Date;
};

export function resolveStatus({ providerStatus, lastPaymentStatus, trialEndsAt, now }: ResolveStatusInput): SubscriptionStatus {
  if (providerStatus !== 'active') return providerStatus;
  if (lastPaymentStatus === 'failed') return 'past_due';
  if (lastPaymentStatus === null && trialEndsAt && now < trialEndsAt) return 'trialing';
  return 'active';
}

export function isTrialEligible(history: { status: SubscriptionStatus; trialEndsAt: Date | null }[]): boolean {
  return history.every((subscription) => subscription.trialEndsAt === null || subscription.status === 'pending');
}

export type FirstChargeInput = {
  now: Date;
  trialDays: number;
  paidUntil: Date | null;
};

export function firstChargeDate({ now, trialDays, paidUntil }: FirstChargeInput): Date {
  const trialEnd = new Date(now.getTime() + trialDays * DAY_MS);
  return paidUntil && paidUntil > trialEnd ? paidUntil : trialEnd;
}

export function canReuseCheckout(subscription: { checkoutUrl: string | null; createdAt: Date }, now: Date): boolean {
  return subscription.checkoutUrl !== null && now.getTime() - subscription.createdAt.getTime() < CHECKOUT_REUSE_MS;
}
