import { describe, expect, it } from 'vitest';
import { periodEnd, refundableAmount, refundedStatus, unusedAmount } from './refund.rules.js';

const START = new Date('2026-10-01T00:00:00Z');

describe('periodEnd', () => {
  it('adds a month or a year', () => {
    expect(periodEnd(START, 'month')).toEqual(new Date('2026-11-01T00:00:00Z'));
    expect(periodEnd(START, 'year')).toEqual(new Date('2027-10-01T00:00:00Z'));
  });
});

describe('unusedAmount', () => {
  const end = new Date('2026-10-11T00:00:00Z');

  it('returns the proportional share of unused days', () => {
    expect(unusedAmount({ amount: 1000, start: START, end, now: new Date('2026-10-04T00:00:00Z') })).toBe(700);
  });

  it('returns everything before the period starts and nothing after it ends', () => {
    expect(unusedAmount({ amount: 1000, start: START, end, now: new Date('2026-09-30T00:00:00Z') })).toBe(1000);
    expect(unusedAmount({ amount: 1000, start: START, end, now: end })).toBe(0);
  });

  it('rounds down to the cent, in the merchant\'s favor', () => {
    expect(
      unusedAmount({ amount: 1490, start: START, end: new Date('2026-10-04T00:00:00Z'), now: new Date('2026-10-02T00:00:00Z') }),
    ).toBe(993);
  });
});

describe('refundableAmount', () => {
  const payment = { amount: 1490, refundedAmount: 0, paidAt: START };

  it('full returns whatever is left to refund', () => {
    expect(refundableAmount({ ...payment, refundedAmount: 490 }, 'full', 'month', START)).toBe(1000);
  });

  it('prorated never exceeds what is left to refund', () => {
    expect(refundableAmount({ ...payment, refundedAmount: 1400 }, 'prorated', 'month', START)).toBe(90);
  });

  it('prorated halfway through the month refunds roughly half', () => {
    const amount = refundableAmount(payment, 'prorated', 'month', new Date('2026-10-16T12:00:00Z'));
    expect(amount).toBeGreaterThan(700);
    expect(amount).toBeLessThan(760);
  });
});

describe('refundedStatus', () => {
  it('distinguishes a full refund from a partial one', () => {
    expect(refundedStatus(1490, 1490)).toBe('refunded');
    expect(refundedStatus(1490, 500)).toBe('partially_refunded');
  });
});
