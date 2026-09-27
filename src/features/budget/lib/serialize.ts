import type { BudgetKind, BudgetPeriodUnit, TBudget } from "../types";

interface BudgetRow {
  id: string;
  categoryId: string;
  kind: string;
  periodUnit: string;
  periodCount: number;
  startDate: Date;
  limits: { effectiveFrom: Date; amount: { toString(): string } }[];
}

export const BUDGET_LIMITS = { limits: { orderBy: { effectiveFrom: "asc" } } } as const;

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

export function serializeBudget(row: BudgetRow): TBudget {
  return {
    id: row.id,
    categoryId: row.categoryId,
    kind: row.kind as BudgetKind,
    periodUnit: row.periodUnit as BudgetPeriodUnit,
    periodCount: row.periodCount,
    startDate: toISODate(row.startDate),
    limits: row.limits.map((limit) => ({
      effectiveFrom: toISODate(limit.effectiveFrom),
      amount: Number(limit.amount.toString()),
    })),
  };
}
