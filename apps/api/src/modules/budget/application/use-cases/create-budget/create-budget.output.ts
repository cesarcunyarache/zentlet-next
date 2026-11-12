import type { Budget } from '../../../domain/budget/budget.js';
import type { BudgetLimit } from '../../../domain/budget-limit/budget-limit.js';

export type CreateBudgetOutput = {
  budget: Budget;
  limit: BudgetLimit | null;
  created: boolean;
};
