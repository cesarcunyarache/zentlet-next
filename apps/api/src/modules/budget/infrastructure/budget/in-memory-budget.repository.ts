import { Injectable } from '@nestjs/common';
import type { Budget } from '../../domain/budget/budget.js';
import { BudgetRepository } from '../../domain/budget/budget.repository.js';

@Injectable()
export class InMemoryBudgetRepository extends BudgetRepository {
  private readonly budgets = new Map<string, Budget>();

  async create(budget: Budget): Promise<Budget | 'id_taken' | 'duplicate_budget'> {
    if (this.budgets.has(budget.id)) return 'id_taken';

    const duplicate = [...this.budgets.values()].some(
      (existing) => existing.listId === budget.listId && existing.categoryId === budget.categoryId,
    );
    if (duplicate) return 'duplicate_budget';

    this.budgets.set(budget.id, budget);
    return budget;
  }

  async findById(id: string): Promise<Budget | null> {
    return this.budgets.get(id) ?? null;
  }

  async findOwned(id: string, userId: string): Promise<Budget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.userId !== userId) return null;
    return budget;
  }

  async findOwnedByListAndCategory(userId: string, listId: string, categoryId: string): Promise<Budget | null> {
    const found = [...this.budgets.values()].find(
      (budget) => budget.userId === userId && budget.listId === listId && budget.categoryId === categoryId,
    );
    return found ?? null;
  }
}
