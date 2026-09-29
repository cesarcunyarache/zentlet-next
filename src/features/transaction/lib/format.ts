import { today, toISODate } from "@/lib/dates";
import type { DateRange, Period, TTransaction } from "../types";

const NOON = 12;

export function periodRange(period: Period): DateRange {
  if (period === "all") return {};
  const now = today();
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
