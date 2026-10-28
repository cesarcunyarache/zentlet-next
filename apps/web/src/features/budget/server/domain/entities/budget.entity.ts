import type { BudgetAlert, BudgetAlertKind, BudgetKind, BudgetPeriodUnit } from "../../../types";

export interface BudgetLimit {
  effectiveFrom: Date;
  amount: number;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  listId: string;
  kind: BudgetKind;
  periodUnit: BudgetPeriodUnit;
  periodCount: number;
  startDate: Date;
  limits: BudgetLimit[];
}

export interface BudgetWithAlerts extends Budget {
  alerts: BudgetAlert[];
  categoryName: string;
}

export type BudgetSchedule = Pick<Budget, "startDate" | "kind" | "periodUnit" | "periodCount">;

export interface BudgetCurrentLimit {
  categoryId: string;
  currentLimit: number;
}

export interface NewBudgetAlert {
  kind: BudgetAlertKind;
  value: number;
}

export interface NewBudget extends Omit<Budget, "limits"> {
  initialLimit: number;
  alerts: NewBudgetAlert[];
}
