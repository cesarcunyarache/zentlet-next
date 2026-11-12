import { Injectable } from '@nestjs/common';
import type { BudgetAlert, NewBudgetAlert } from '../../domain/budget-alert/budget-alert.js';
import { BudgetAlertRepository } from '../../domain/budget-alert/budget-alert.repository.js';

@Injectable()
export class InMemoryBudgetAlertRepository extends BudgetAlertRepository {
  private readonly alertsByBudget = new Map<string, BudgetAlert[]>();

  async replaceAllForBudget(budgetId: string, alerts: NewBudgetAlert[]): Promise<BudgetAlert[]> {
    const saved = alerts.map((alert) => ({ id: crypto.randomUUID(), budgetId, ...alert }));
    this.alertsByBudget.set(budgetId, saved);
    return saved;
  }

  async findAllByBudgetId(budgetId: string): Promise<BudgetAlert[]> {
    return this.alertsByBudget.get(budgetId) ?? [];
  }
}
