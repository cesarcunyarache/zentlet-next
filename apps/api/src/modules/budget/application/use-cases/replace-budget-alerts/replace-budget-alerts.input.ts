import type { NewBudgetAlert } from '../../../domain/budget-alert/budget-alert.js';

export type ReplaceBudgetAlertsInput = {
  userId: string;
  budgetId: string;
  alerts: NewBudgetAlert[];
};
