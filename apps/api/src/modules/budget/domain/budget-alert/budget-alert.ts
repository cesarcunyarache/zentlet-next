export type BudgetAlertKind = 'percent' | 'amount';

export type BudgetAlert = {
  id: string;
  budgetId: string;
  kind: BudgetAlertKind;
  value: number;
};

export type NewBudgetAlert = {
  kind: BudgetAlertKind;
  value: number;
};
