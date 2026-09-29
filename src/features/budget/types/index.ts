export type BudgetPeriodUnit = "week" | "half_month" | "month" | "year";

export type BudgetPeriod = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export type BudgetKind = "recurring" | "once";

export interface BudgetRule {
  periodUnit: BudgetPeriodUnit;
  periodCount: number;
}

export interface TBudgetLimit {
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

export interface PeriodRange {
  from: string;
  to: string;
}
