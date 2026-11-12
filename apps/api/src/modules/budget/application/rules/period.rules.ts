import type { BudgetKind, BudgetPeriodUnit } from '../../domain/budget/budget.js';

export type PeriodRange = { from: string; to: string };

export type PeriodRule = { periodUnit: BudgetPeriodUnit; periodCount: number };

export type BudgetSchedule = PeriodRule & { kind: BudgetKind; startDate: string };

export type LimitEntry = { effectiveFrom: string; amount: number };

const HALF_MONTH_START = 16;
const DAYS_PER_WEEK = 7;

const isoDay = (year: number, monthIndex: number, day: number) =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

/** `startDate`/`effectiveFrom` are date-only columns (`@db.Date`): represent them as plain `YYYY-MM-DD`, same as apps/web, to keep the period math (which relies on string slicing/compare) identical to the source it was ported from. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromISODate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function periodContaining({ periodUnit, periodCount }: PeriodRule, date: string): PeriodRange {
  const [year, month, day] = date.split('-').map(Number);
  const monthIndex = month - 1;

  if (periodUnit === 'week') {
    const monday = day - ((new Date(Date.UTC(year, monthIndex, day)).getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK);
    return { from: isoDay(year, monthIndex, monday), to: isoDay(year, monthIndex, monday + DAYS_PER_WEEK * periodCount) };
  }
  if (periodUnit === 'half_month') {
    return day < HALF_MONTH_START
      ? { from: isoDay(year, monthIndex, 1), to: isoDay(year, monthIndex, HALF_MONTH_START) }
      : { from: isoDay(year, monthIndex, HALF_MONTH_START), to: isoDay(year, monthIndex + 1, 1) };
  }
  if (periodUnit === 'month') {
    const first = monthIndex - (monthIndex % periodCount);
    return { from: isoDay(year, first, 1), to: isoDay(year, first + periodCount, 1) };
  }
  return { from: isoDay(year, 0, 1), to: isoDay(year + periodCount, 0, 1) };
}

export function isPeriodStart(rule: PeriodRule, date: string): boolean {
  return periodContaining(rule, date).from === date;
}

/** `null` before the budget's `startDate`; for a `kind: "once"` budget, only the period that contains `startDate` is ever active. */
export function activePeriod(schedule: BudgetSchedule, date: string): PeriodRange | null {
  if (date < schedule.startDate) return null;
  const period = periodContaining(schedule, date);
  if (schedule.kind === 'once' && period.from !== schedule.startDate) return null;
  return period;
}

/** The latest limit with `effectiveFrom <= at`, independent of history order. `null` before the budget started or if no limit applies yet. */
export function limitAt(startDate: string, limits: LimitEntry[], at: string): number | null {
  if (at < startDate) return null;
  const current = limits
    .filter((limit) => limit.effectiveFrom <= at)
    .reduce<LimitEntry | null>((latest, limit) => (!latest || limit.effectiveFrom > latest.effectiveFrom ? limit : latest), null);
  return current?.amount ?? null;
}
