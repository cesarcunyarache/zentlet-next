import type { Budget } from './budget.js';

export abstract class BudgetRepository {
  abstract create(budget: Budget): Promise<Budget | 'id_taken' | 'duplicate_budget'>;

  abstract findById(id: string): Promise<Budget | null>;

  abstract findOwned(id: string, userId: string): Promise<Budget | null>;

  abstract findOwnedByListAndCategory(userId: string, listId: string, categoryId: string): Promise<Budget | null>;
}
