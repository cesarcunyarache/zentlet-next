import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { BudgetAlert, BudgetAlertKind, NewBudgetAlert } from '../../domain/budget-alert/budget-alert.js';
import { BudgetAlertRepository } from '../../domain/budget-alert/budget-alert.repository.js';

const ORDER = [{ kind: 'asc' as const }, { value: 'asc' as const }];

function toDomain(row: { id: string; budgetId: string; kind: string; value: unknown }): BudgetAlert {
  return { id: row.id, budgetId: row.budgetId, kind: row.kind as BudgetAlertKind, value: Number(row.value) };
}

@Injectable()
export class PrismaBudgetAlertRepository extends BudgetAlertRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async replaceAllForBudget(budgetId: string, alerts: NewBudgetAlert[]): Promise<BudgetAlert[]> {
    const [, , saved] = await this.prisma.$transaction([
      this.prisma.budgetAlert.deleteMany({ where: { budgetId } }),
      this.prisma.budgetAlert.createMany({ data: alerts.map((alert) => ({ ...alert, budgetId })) }),
      this.prisma.budgetAlert.findMany({ where: { budgetId }, orderBy: ORDER }),
    ]);
    return saved.map(toDomain);
  }

  async findAllByBudgetId(budgetId: string): Promise<BudgetAlert[]> {
    const rows = await this.prisma.budgetAlert.findMany({ where: { budgetId }, orderBy: ORDER });
    return rows.map(toDomain);
  }
}
