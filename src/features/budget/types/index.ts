export type BudgetPeriodUnit = "week" | "half_month" | "month" | "year";

export type BudgetPeriod = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

/** recurring: se renueva cada periodo | once: sólo vale en el periodo en que se creó. */
export type BudgetKind = "recurring" | "once";

export interface BudgetRule {
  periodUnit: BudgetPeriodUnit;
  periodCount: number;
}

export interface TBudgetLimit {
  /** Inicio del periodo desde el que aplica, `YYYY-MM-DD`. */
  effectiveFrom: string;
  amount: number;
}

export interface TBudget extends BudgetRule {
  id: string;
  categoryId: string;
  kind: BudgetKind;
  startDate: string;
  limits: TBudgetLimit[];
}

/** Rango `[from, to)` de un periodo. */
export interface PeriodRange {
  from: string;
  to: string;
}
