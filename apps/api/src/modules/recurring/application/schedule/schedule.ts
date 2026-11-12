import type { RecurrenceFrequency } from '../../domain/recurring-transaction/recurring-transaction.js';

type MonthlyFrequency = Exclude<RecurrenceFrequency, 'WEEKLY'>;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const MONTHS_PER_STEP: Record<MonthlyFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

/** Occurrences generated per `materialize-due-transactions` run, matching the real app's catch-up cap. */
export const MAX_OCCURRENCES_PER_RUN = 60;

/**
 * Adds `months` to `anchor`'s month, clamping the day to the last day of the
 * resulting month. Every occurrence is computed from the original anchor
 * (never chained from the previous occurrence), so a 31st-anchor clamped to
 * Feb 28/29 correctly jumps back to the 31st in March.
 */
function addMonthsKeepingDay(anchor: Date, months: number): Date {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + months;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(anchor.getUTCDate(), lastDayOfMonth)));
}

export function occurrenceDate(anchorDate: Date, frequency: RecurrenceFrequency, index: number): Date {
  if (frequency === 'WEEKLY') return new Date(anchorDate.getTime() + index * WEEK_MS);
  return addMonthsKeepingDay(anchorDate, index * MONTHS_PER_STEP[frequency]);
}

function estimateIndex(anchorDate: Date, frequency: RecurrenceFrequency, date: Date): number {
  if (frequency === 'WEEKLY') return Math.floor((date.getTime() - anchorDate.getTime()) / WEEK_MS);
  const months =
    (date.getUTCFullYear() - anchorDate.getUTCFullYear()) * 12 + (date.getUTCMonth() - anchorDate.getUTCMonth());
  return Math.floor(months / MONTHS_PER_STEP[frequency]);
}

export function nextOccurrenceAfter(anchorDate: Date, frequency: RecurrenceFrequency, after: Date): Date {
  let index = Math.max(1, estimateIndex(anchorDate, frequency, after));
  let candidate = occurrenceDate(anchorDate, frequency, index);
  while (candidate.getTime() <= after.getTime()) {
    index += 1;
    candidate = occurrenceDate(anchorDate, frequency, index);
  }
  return candidate;
}

export type DueSchedule = {
  anchorDate: Date;
  frequency: RecurrenceFrequency;
  nextDueDate: Date;
};

export type DueDatesResult = {
  dates: Date[];
  nextDueDate: Date;
};

export function dueDatesThrough(schedule: DueSchedule, today: Date, limit: number): DueDatesResult {
  const dates: Date[] = [];
  let due = schedule.nextDueDate;
  while (due.getTime() <= today.getTime() && dates.length < limit) {
    dates.push(due);
    due = nextOccurrenceAfter(schedule.anchorDate, schedule.frequency, due);
  }
  return { dates, nextDueDate: due };
}

/** Normalizes any `Date` to UTC midnight, matching the precision of `@db.Date` columns. */
export function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
