import { today, toISODate } from "@/lib/dates";
import type { DateRange, Period, TTransaction } from "../types";

const NOON = 12;
const DAYS_IN_WEEK = 7;
const MONDAY_OFFSET = 6;

function weekRange(now: Date): DateRange {
  const daysSinceMonday = (now.getDay() + MONDAY_OFFSET) % DAYS_IN_WEEK;
  const monday = now.getDate() - daysSinceMonday;
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth(), monday, NOON)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth(), monday + DAYS_IN_WEEK, NOON)),
  };
}

export function periodRange(period: Period): DateRange {
  if (period === "all") return {};
  const now = today();
  if (period === "week") return weekRange(now);
  const month = now.getMonth() - (period === "previous" ? 1 : 0);
  return {
    from: toISODate(new Date(now.getFullYear(), month, 1, NOON)),
    to: toISODate(new Date(now.getFullYear(), month + 1, 1, NOON)),
  };
}

export function signedAmount(tx: TTransaction) {
  return tx.type === "expense" ? -tx.amount : tx.amount;
}

export function describeOrFallback(description: string, categoryName: string | undefined, defaultDescription: string) {
  return description || categoryName || defaultDescription;
}
