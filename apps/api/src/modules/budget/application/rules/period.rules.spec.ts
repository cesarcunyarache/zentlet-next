import { describe, expect, it } from 'vitest';
import { activePeriod, fromISODate, isPeriodStart, limitAt, periodContaining, toISODate } from './period.rules.js';

const weekly = { periodUnit: 'week' as const, periodCount: 1 };
const biweekly = { periodUnit: 'half_month' as const, periodCount: 1 };
const monthly = { periodUnit: 'month' as const, periodCount: 1 };
const quarterly = { periodUnit: 'month' as const, periodCount: 3 };
const yearly = { periodUnit: 'year' as const, periodCount: 1 };

describe('periodContaining', () => {
  it('week: monday to monday', () => {
    expect(periodContaining(weekly, '2026-09-26')).toEqual({ from: '2026-09-21', to: '2026-09-28' });
    expect(periodContaining(weekly, '2026-09-21')).toEqual({ from: '2026-09-21', to: '2026-09-28' });
    expect(periodContaining(weekly, '2026-09-27')).toEqual({ from: '2026-09-21', to: '2026-09-28' });
  });

  it('week: crosses a month or a year boundary', () => {
    expect(periodContaining(weekly, '2027-01-01')).toEqual({ from: '2026-12-28', to: '2027-01-04' });
  });

  it('half_month: 1st-15th and 16th-end of month', () => {
    expect(periodContaining(biweekly, '2026-09-15')).toEqual({ from: '2026-09-01', to: '2026-09-16' });
    expect(periodContaining(biweekly, '2026-09-16')).toEqual({ from: '2026-09-16', to: '2026-10-01' });
    expect(periodContaining(biweekly, '2026-12-31')).toEqual({ from: '2026-12-16', to: '2027-01-01' });
  });

  it('month: the calendar month', () => {
    expect(periodContaining(monthly, '2026-02-28')).toEqual({ from: '2026-02-01', to: '2026-03-01' });
    expect(periodContaining(monthly, '2026-12-10')).toEqual({ from: '2026-12-01', to: '2027-01-01' });
  });

  it('quarterly: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec', () => {
    expect(periodContaining(quarterly, '2026-09-26')).toEqual({ from: '2026-07-01', to: '2026-10-01' });
    expect(periodContaining(quarterly, '2026-10-01')).toEqual({ from: '2026-10-01', to: '2027-01-01' });
  });

  it('year: the calendar year', () => {
    expect(periodContaining(yearly, '2026-09-26')).toEqual({ from: '2026-01-01', to: '2027-01-01' });
  });
});

describe('isPeriodStart', () => {
  it('only the first day of each period starts it', () => {
    expect(isPeriodStart(weekly, '2026-09-21')).toBe(true);
    expect(isPeriodStart(weekly, '2026-09-22')).toBe(false);
    expect(isPeriodStart(biweekly, '2026-09-16')).toBe(true);
    expect(isPeriodStart(biweekly, '2026-09-15')).toBe(false);
    expect(isPeriodStart(quarterly, '2026-07-01')).toBe(true);
    expect(isPeriodStart(quarterly, '2026-08-01')).toBe(false);
    expect(isPeriodStart(yearly, '2026-01-01')).toBe(true);
  });
});

describe('activePeriod', () => {
  const recurring = { ...monthly, kind: 'recurring' as const, startDate: '2026-07-01' };

  it('a recurring budget is active in any period since its start', () => {
    expect(activePeriod(recurring, '2027-03-10')).toEqual({ from: '2027-03-01', to: '2027-04-01' });
  });

  it('is not active before its start', () => {
    expect(activePeriod(recurring, '2026-06-30')).toBeNull();
  });

  it('a "once" budget is only active in its original period', () => {
    const once = { ...weekly, kind: 'once' as const, startDate: '2026-09-21' };
    expect(activePeriod(once, '2026-09-27')).toEqual({ from: '2026-09-21', to: '2026-09-28' });
    expect(activePeriod(once, '2026-09-28')).toBeNull();
  });
});

describe('limitAt', () => {
  const startDate = '2026-07-01';
  const limits = [
    { effectiveFrom: '2026-07-01', amount: 600 },
    { effectiveFrom: '2026-09-01', amount: 800 },
  ];

  it('uses the limit effective for that period, not the current one', () => {
    expect(limitAt(startDate, limits, '2026-08-01')).toBe(600);
    expect(limitAt(startDate, limits, '2026-09-01')).toBe(800);
  });

  it('has no limit before the budget was created', () => {
    expect(limitAt(startDate, limits, '2026-06-01')).toBeNull();
  });

  it('does not depend on the order history arrives in', () => {
    expect(limitAt(startDate, [...limits].reverse(), '2026-10-01')).toBe(800);
  });
});

describe('toISODate / fromISODate', () => {
  it('round-trips a date-only value through UTC midnight', () => {
    const iso = '2026-09-21';
    expect(toISODate(fromISODate(iso))).toBe(iso);
  });
});
