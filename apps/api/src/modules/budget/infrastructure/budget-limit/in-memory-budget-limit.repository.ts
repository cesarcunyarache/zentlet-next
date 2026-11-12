import { Injectable } from '@nestjs/common';
import type { BudgetLimit } from '../../domain/budget-limit/budget-limit.js';
import { BudgetLimitRepository } from '../../domain/budget-limit/budget-limit.repository.js';

@Injectable()
export class InMemoryBudgetLimitRepository extends BudgetLimitRepository {
  private readonly limits = new Map<string, BudgetLimit>();

  private key(budgetId: string, effectiveFrom: Date): string {
    return `${budgetId}:${effectiveFrom.getTime()}`;
  }

  async append(limit: BudgetLimit): Promise<BudgetLimit> {
    this.limits.set(this.key(limit.budgetId, limit.effectiveFrom), limit);
    return limit;
  }

  async findAllByBudgetId(budgetId: string): Promise<BudgetLimit[]> {
    return [...this.limits.values()]
      .filter((limit) => limit.budgetId === budgetId)
      .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
  }
}
