import type { BudgetAlert, NewBudgetAlert } from './budget-alert.js';

export abstract class BudgetAlertRepository {
  abstract replaceAllForBudget(budgetId: string, alerts: NewBudgetAlert[]): Promise<BudgetAlert[]>;

  abstract findAllByBudgetId(budgetId: string): Promise<BudgetAlert[]>;
}
