import { today, toISODate } from "@/lib/dates";
import type { DateRange } from "@/features/transaction/types";
import type { BudgetPeriod, BudgetRule, PeriodRange, TBudget, TBudgetLimit } from "../types";

export const BUDGET_PERIODS = {
  weekly: { periodUnit: "week", periodCount: 1 },
  biweekly: { periodUnit: "half_month", periodCount: 1 },
  monthly: { periodUnit: "month", periodCount: 1 },
  quarterly: { periodUnit: "month", periodCount: 3 },
  yearly: { periodUnit: "year", periodCount: 1 },
} as const satisfies Record<BudgetPeriod, BudgetRule>;

export const BUDGET_PERIOD_OPTIONS = Object.keys(BUDGET_PERIODS) as BudgetPeriod[];

const HALF_MONTH_START = 16;
const DAYS_PER_WEEK = 7;

export function budgetPeriodOf({ periodUnit, periodCount }: BudgetRule): BudgetPeriod | null {
  const match = BUDGET_PERIOD_OPTIONS.find(
    (period) => BUDGET_PERIODS[period].periodUnit === periodUnit && BUDGET_PERIODS[period].periodCount === periodCount,
  );
  return match ?? null;
}

const isoDay = (year: number, monthIndex: number, day: number) =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

export function periodContaining({ periodUnit, periodCount }: BudgetRule, date: string): PeriodRange {
  const [year, month, day] = date.split("-").map(Number);
  const monthIndex = month - 1;

  if (periodUnit === "week") {
    const monday = day - (new Date(Date.UTC(year, monthIndex, day)).getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
    return { from: isoDay(year, monthIndex, monday), to: isoDay(year, monthIndex, monday + DAYS_PER_WEEK * periodCount) };
  }
  if (periodUnit === "half_month") {
    return day < HALF_MONTH_START
      ? { from: isoDay(year, monthIndex, 1), to: isoDay(year, monthIndex, HALF_MONTH_START) }
      : { from: isoDay(year, monthIndex, HALF_MONTH_START), to: isoDay(year, monthIndex + 1, 1) };
  }
  if (periodUnit === "month") {
    const first = monthIndex - (monthIndex % periodCount);
    return { from: isoDay(year, first, 1), to: isoDay(year, first + periodCount, 1) };
  }
  return { from: isoDay(year, 0, 1), to: isoDay(year + periodCount, 0, 1) };
}

export function isPeriodStart(rule: BudgetRule, date: string) {
  return periodContaining(rule, date).from === date;
}

export function activePeriod(budget: TBudget, date: string): PeriodRange | null {
  if (date < budget.startDate) return null;
  const period = periodContaining(budget, date);
  if (budget.kind === "once" && period.from !== budget.startDate) return null;
  return period;
}

export function budgetRangeForView(budget: TBudget, view: DateRange, date: string): PeriodRange | null {
  if (!view.from || !view.to) return null;
  if (view.from <= date && date < view.to) return activePeriod(budget, date);
  const period = activePeriod(budget, view.from);
  return period?.from === view.from && period.to === view.to ? period : null;
}

export function todayISO() {
  return toISODate(today());
}

export function limitAt(budget: Pick<TBudget, "startDate" | "limits">, start: string): number | null {
  if (start < budget.startDate) return null;
  const current = budget.limits
    .filter((limit) => limit.effectiveFrom <= start)
    .reduce<TBudgetLimit | null>(
      (latest, limit) => (!latest || limit.effectiveFrom > latest.effectiveFrom ? limit : latest),
      null,
    );
  return current?.amount ?? null;
}

export function withLimit(budget: TBudget, limit: TBudgetLimit): TBudget {
  const others = budget.limits.filter((current) => current.effectiveFrom !== limit.effectiveFrom);
  return { ...budget, limits: [...others, limit].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)) };
}
