import type { BudgetLimit } from './budget-limit.js';

export abstract class BudgetLimitRepository {
  /** Upserts the limit for `(budgetId, effectiveFrom)`: history is append-only per period, not a single mutable amount. */
  abstract append(limit: BudgetLimit): Promise<BudgetLimit>;

  abstract findAllByBudgetId(budgetId: string): Promise<BudgetLimit[]>;
}
