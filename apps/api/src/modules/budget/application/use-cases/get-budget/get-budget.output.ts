import type { Budget } from '../../../domain/budget/budget.js';
import type { BudgetAlert } from '../../../domain/budget-alert/budget-alert.js';
import type { BudgetLimit } from '../../../domain/budget-limit/budget-limit.js';

export type GetBudgetOutput = {
  budget: Budget;
  limits: BudgetLimit[];
  alerts: BudgetAlert[];
};
