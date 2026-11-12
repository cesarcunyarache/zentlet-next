import { Injectable } from '@nestjs/common';
import type { Budget as BudgetRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { Budget, BudgetKind, BudgetPeriodUnit } from '../../domain/budget/budget.js';
import { BudgetRepository } from '../../domain/budget/budget.repository.js';
import { isUniqueViolation, uniqueViolationTarget } from '../db-errors.js';

function toDomain(row: BudgetRow): Budget {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    listId: row.listId,
    kind: row.kind as BudgetKind,
    periodUnit: row.periodUnit as BudgetPeriodUnit,
    periodCount: row.periodCount,
    startDate: row.startDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaBudgetRepository extends BudgetRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(budget: Budget): Promise<Budget | 'id_taken' | 'duplicate_budget'> {
    try {
      const row = await this.prisma.budget.create({
        data: {
          id: budget.id,
          userId: budget.userId,
          categoryId: budget.categoryId,
          listId: budget.listId,
          kind: budget.kind,
          periodUnit: budget.periodUnit,
          periodCount: budget.periodCount,
          startDate: budget.startDate,
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt,
        },
      });
      return toDomain(row);
    } catch (error) {
      const target = uniqueViolationTarget(error);
      if (target?.includes('listId') && target?.includes('categoryId')) return 'duplicate_budget';
      if (isUniqueViolation(error)) return 'id_taken';
      throw error;
    }
  }

  async findById(id: string): Promise<Budget | null> {
    const row = await this.prisma.budget.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findOwned(id: string, userId: string): Promise<Budget | null> {
    const row = await this.prisma.budget.findFirst({ where: { id, userId } });
    return row ? toDomain(row) : null;
  }

  async findOwnedByListAndCategory(userId: string, listId: string, categoryId: string): Promise<Budget | null> {
    const row = await this.prisma.budget.findFirst({ where: { userId, listId, categoryId } });
    return row ? toDomain(row) : null;
  }
}
