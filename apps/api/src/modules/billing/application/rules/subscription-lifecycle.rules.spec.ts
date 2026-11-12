import { describe, expect, it } from 'vitest';
import { canReuseCheckout, firstChargeDate, isLive, isTrialEligible, resolveStatus } from './subscription-lifecycle.rules.js';

const NOW = new Date('2026-10-15T12:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('isLive', () => {
  it('canceled is the only status that does not block a new subscription', () => {
    expect(isLive('pending')).toBe(true);
    expect(isLive('trialing')).toBe(true);
    expect(isLive('past_due')).toBe(true);
    expect(isLive('canceled')).toBe(false);
  });
});

describe('resolveStatus', () => {
  const input = {
    providerStatus: 'active' as const,
    lastPaymentStatus: null,
    trialEndsAt: null,
    now: NOW,
  };

  it('a failed payment turns active into past_due', () => {
    expect(resolveStatus({ ...input, lastPaymentStatus: 'failed' })).toBe('past_due');
    expect(resolveStatus({ ...input, lastPaymentStatus: 'approved' })).toBe('active');
    expect(resolveStatus({ ...input, providerStatus: 'canceled', lastPaymentStatus: 'failed' })).toBe('canceled');
  });

  it('authorized with no charges yet and inside the trial window is trialing', () => {
    expect(resolveStatus({ ...input, trialEndsAt: days(5) })).toBe('trialing');
    expect(resolveStatus({ ...input, trialEndsAt: days(-1) })).toBe('active');
    expect(resolveStatus({ ...input, trialEndsAt: days(5), lastPaymentStatus: 'approved' })).toBe('active');
  });

  it('authorized with no trial is active even if the first charge is in the future', () => {
    expect(resolveStatus(input)).toBe('active');
  });
});

describe('isTrialEligible', () => {
  it('allows only one trial per user', () => {
    expect(isTrialEligible([])).toBe(true);
    expect(isTrialEligible([{ status: 'canceled', trialEndsAt: null }])).toBe(true);
    expect(isTrialEligible([{ status: 'canceled', trialEndsAt: days(-40) }])).toBe(false);
  });

  it('a pending checkout does not consume the trial yet', () => {
    expect(isTrialEligible([{ status: 'pending', trialEndsAt: days(15) }])).toBe(true);
  });
});

describe('firstChargeDate', () => {
  it('charges today with no trial and no paid period', () => {
    expect(firstChargeDate({ now: NOW, trialDays: 0, paidUntil: null })).toEqual(NOW);
  });

  it('charges when the trial ends', () => {
    expect(firstChargeDate({ now: NOW, trialDays: 15, paidUntil: null })).toEqual(days(15));
  });

  it('re-subscribing with a paid period left does not charge twice', () => {
    expect(firstChargeDate({ now: NOW, trialDays: 0, paidUntil: days(20) })).toEqual(days(20));
  });
});

describe('canReuseCheckout', () => {
  it('reuses a recent checkout with a url', () => {
    expect(canReuseCheckout({ checkoutUrl: 'https://mp/checkout', createdAt: days(-0.5) }, NOW)).toBe(true);
    expect(canReuseCheckout({ checkoutUrl: 'https://mp/checkout', createdAt: days(-2) }, NOW)).toBe(false);
    expect(canReuseCheckout({ checkoutUrl: null, createdAt: NOW }, NOW)).toBe(false);
  });
});
