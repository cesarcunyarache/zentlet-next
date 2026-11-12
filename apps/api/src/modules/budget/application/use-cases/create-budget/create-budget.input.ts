import type { BudgetKind, BudgetPeriodUnit } from '../../../domain/budget/budget.js';

export type CreateBudgetInput = {
  id?: string;
  userId: string;
  categoryId: string;
  listId: string;
  kind: BudgetKind;
  periodUnit: BudgetPeriodUnit;
  periodCount: number;
  startDate: Date;
  initialLimitAmount: number;
};
