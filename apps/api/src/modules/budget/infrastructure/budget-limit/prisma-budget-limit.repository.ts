import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { BudgetLimit } from '../../domain/budget-limit/budget-limit.js';
import { BudgetLimitRepository } from '../../domain/budget-limit/budget-limit.repository.js';

@Injectable()
export class PrismaBudgetLimitRepository extends BudgetLimitRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async append(limit: BudgetLimit): Promise<BudgetLimit> {
    const row = await this.prisma.budgetLimit.upsert({
      where: { budgetId_effectiveFrom: { budgetId: limit.budgetId, effectiveFrom: limit.effectiveFrom } },
      create: { budgetId: limit.budgetId, effectiveFrom: limit.effectiveFrom, amount: limit.amount },
      update: { amount: limit.amount },
    });
    return { budgetId: row.budgetId, effectiveFrom: row.effectiveFrom, amount: Number(row.amount) };
  }

  async findAllByBudgetId(budgetId: string): Promise<BudgetLimit[]> {
    const rows = await this.prisma.budgetLimit.findMany({ where: { budgetId }, orderBy: { effectiveFrom: 'asc' } });
    return rows.map((row) => ({ budgetId: row.budgetId, effectiveFrom: row.effectiveFrom, amount: Number(row.amount) }));
  }
}
