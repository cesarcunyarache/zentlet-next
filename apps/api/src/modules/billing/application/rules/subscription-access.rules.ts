import type { SubscriptionStatus } from '../../domain/billing.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const PAST_DUE_GRACE_DAYS = 10;

export type AccessWindow = {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

const isBefore = (now: Date, limit: Date | null, extraMs = 0) =>
  limit !== null && now.getTime() < limit.getTime() + extraMs;

// Whether this subscription currently grants paid access, independent of any
// plan catalog — that projection (plan name, features) lives outside this module.
export function grantsAccess(subscription: AccessWindow, now: Date): boolean {
  switch (subscription.status) {
    case 'active':
      return true;
    case 'trialing':
      return isBefore(now, subscription.trialEndsAt);
    case 'past_due':
      return isBefore(now, subscription.currentPeriodEnd, PAST_DUE_GRACE_DAYS * DAY_MS);
    case 'canceled':
      return isBefore(now, subscription.currentPeriodEnd);
    case 'pending':
      return false;
  }
}
