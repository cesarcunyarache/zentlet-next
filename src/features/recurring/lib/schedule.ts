import { toUTCISODate } from "@/lib/dates";
import type { RecurrenceFrequency } from "../types";

type MonthlyFrequency = Exclude<RecurrenceFrequency, "WEEKLY">;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const MONTHS_PER_STEP: Record<MonthlyFrequency, number> = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 };

const parseIsoDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

function addMonthsKeepingDay(anchor: Date, months: number) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + months;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(anchor.getUTCDate(), lastDayOfMonth)));
}

export function occurrenceDate(anchorDate: string, frequency: RecurrenceFrequency, index: number) {
  const anchor = parseIsoDate(anchorDate);
  if (frequency === "WEEKLY") return toUTCISODate(new Date(anchor.getTime() + index * WEEK_MS));
  return toUTCISODate(addMonthsKeepingDay(anchor, index * MONTHS_PER_STEP[frequency]));
}

function estimateIndex(anchorDate: string, frequency: RecurrenceFrequency, date: string) {
  const anchor = parseIsoDate(anchorDate);
  const target = parseIsoDate(date);
  if (frequency === "WEEKLY") return Math.floor((target.getTime() - anchor.getTime()) / WEEK_MS);
  const months = (target.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + target.getUTCMonth() - anchor.getUTCMonth();
  return Math.floor(months / MONTHS_PER_STEP[frequency]);
}

export function nextOccurrenceAfter(anchorDate: string, frequency: RecurrenceFrequency, after: string) {
  let index = Math.max(1, estimateIndex(anchorDate, frequency, after));
  while (occurrenceDate(anchorDate, frequency, index) <= after) index++;
  return occurrenceDate(anchorDate, frequency, index);
}

interface DueSchedule {
  anchorDate: string;
  frequency: RecurrenceFrequency;
  nextDueDate: string;
}

export function dueDatesThrough({ anchorDate, frequency, nextDueDate }: DueSchedule, today: string, limit: number) {
  const dates: string[] = [];
  let due = nextDueDate;
  while (due <= today && dates.length < limit) {
    dates.push(due);
    due = nextOccurrenceAfter(anchorDate, frequency, due);
  }
  return { dates, nextDueDate: due };
}
