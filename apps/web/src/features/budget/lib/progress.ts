import type { DateRange } from "@/features/transaction/types";
import type { PeriodRange, TBudget } from "../types";
import { budgetRangeForView, limitAt } from "./period";

interface BudgetMeasurement {
  categoryId: string;
  range: PeriodRange;
  limit: number;
}

export function budgetMeasurements(budgets: TBudget[], view: DateRange, date: string): BudgetMeasurement[] {
  return budgets.flatMap((budget) => {
    const range = budgetRangeForView(budget, view, date);
    const limit = range && limitAt(budget, range.from);
    return range && limit !== null ? [{ categoryId: budget.categoryId, range, limit }] : [];
  });
}

export function budgetPreview(spent: number, limit: number) {
  if (limit <= 0) return null;
  return {
    ratio: Math.min(spent / limit, 1),
    remaining: Math.max(limit - spent, 0),
    excess: Math.max(spent - limit, 0),
  };
}

export function spentPercent(spent: number, limit: number) {
  return limit > 0 ? Math.round((spent / limit) * 100) : 0;
}

const DAY_MS = 86_400_000;
const utcDay = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

export function daysLeft({ to }: PeriodRange, date: string) {
  return Math.round((utcDay(to).getTime() - utcDay(date).getTime()) / DAY_MS);
}

export function periodRangeLabel({ from, to }: PeriodRange, locale: string) {
  const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  return format.formatRange(utcDay(from), new Date(utcDay(to).getTime() - DAY_MS));
}
