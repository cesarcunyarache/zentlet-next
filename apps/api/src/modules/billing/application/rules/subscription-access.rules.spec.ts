import { describe, expect, it } from 'vitest';
import { grantsAccess, PAST_DUE_GRACE_DAYS } from './subscription-access.rules.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-15T12:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * DAY_MS);

describe('grantsAccess', () => {
  it('active always grants access', () => {
    expect(grantsAccess({ status: 'active', trialEndsAt: null, currentPeriodEnd: null }, NOW)).toBe(true);
  });

  it('trialing grants access only until the trial ends', () => {
    expect(grantsAccess({ status: 'trialing', trialEndsAt: days(1), currentPeriodEnd: null }, NOW)).toBe(true);
    expect(grantsAccess({ status: 'trialing', trialEndsAt: days(-1), currentPeriodEnd: null }, NOW)).toBe(false);
  });

  it('past_due grants access during the retry grace window', () => {
    const periodEnd = days(-1);
    expect(grantsAccess({ status: 'past_due', trialEndsAt: null, currentPeriodEnd: periodEnd }, NOW)).toBe(true);
    const past = new Date(periodEnd.getTime() + (PAST_DUE_GRACE_DAYS + 1) * DAY_MS);
    expect(grantsAccess({ status: 'past_due', trialEndsAt: null, currentPeriodEnd: periodEnd }, past)).toBe(false);
  });

  it('canceled grants access until the paid period ends', () => {
    expect(grantsAccess({ status: 'canceled', trialEndsAt: null, currentPeriodEnd: days(1) }, NOW)).toBe(true);
    expect(grantsAccess({ status: 'canceled', trialEndsAt: null, currentPeriodEnd: days(-1) }, NOW)).toBe(false);
    expect(grantsAccess({ status: 'canceled', trialEndsAt: null, currentPeriodEnd: null }, NOW)).toBe(false);
  });

  it('pending never grants access', () => {
    expect(grantsAccess({ status: 'pending', trialEndsAt: null, currentPeriodEnd: null }, NOW)).toBe(false);
  });
});
