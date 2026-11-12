import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import type { Budget } from '../../../domain/budget/budget.js';
import { BudgetRepository } from '../../../domain/budget/budget.repository.js';
import { BudgetAlertRepository } from '../../../domain/budget-alert/budget-alert.repository.js';
import { BudgetLimitRepository } from '../../../domain/budget-limit/budget-limit.repository.js';
import { BudgetIdTakenError, CategoryNotOwnedError, DuplicateBudgetError, TransactionListNotOwnedError } from '../../../domain/budget.errors.js';
import { DEFAULT_ALERTS } from '../../rules/alert.rules.js';
import { currentLimitOf } from '../../rules/budget-limit.rules.js';
import type { CreateBudgetInput } from './create-budget.input.js';
import type { CreateBudgetOutput } from './create-budget.output.js';

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetLimitRepository: BudgetLimitRepository,
    private readonly budgetAlertRepository: BudgetAlertRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateBudgetInput): Promise<CreateBudgetOutput> {
    if (input.id) {
      const existing = await this.budgetRepository.findById(input.id);
      if (existing) {
        if (existing.userId !== input.userId) throw new BudgetIdTakenError(input.id);
        return this.toOutput(existing, false);
      }
    }

    const ownsCategory = await this.categoryBelongsToUser(input.categoryId, input.userId);
    if (!ownsCategory) throw new CategoryNotOwnedError(input.categoryId);

    const ownsList = await this.listBelongsToUser(input.listId, input.userId);
    if (!ownsList) throw new TransactionListNotOwnedError(input.listId);

    const now = new Date();
    const draft: Budget = {
      id: input.id ?? crypto.randomUUID(),
      userId: input.userId,
      categoryId: input.categoryId,
      listId: input.listId,
      kind: input.kind,
      periodUnit: input.periodUnit,
      periodCount: input.periodCount,
      startDate: input.startDate,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.budgetRepository.create(draft);
    if (created === 'id_taken') {
      // Lost the race between our existence check and the insert: another
      // request with the same id landed first.
      const retried = await this.budgetRepository.findOwned(draft.id, input.userId);
      if (!retried) throw new BudgetIdTakenError(draft.id);
      return this.toOutput(retried, false);
    }
    if (created === 'duplicate_budget') throw new DuplicateBudgetError(input.listId, input.categoryId);

    const limit = await this.budgetLimitRepository.append({
      budgetId: created.id,
      effectiveFrom: created.startDate,
      amount: input.initialLimitAmount,
    });
    await this.budgetAlertRepository.replaceAllForBudget(created.id, DEFAULT_ALERTS);

    return { budget: created, limit, created: true };
  }

  private async toOutput(budget: Budget, created: boolean): Promise<CreateBudgetOutput> {
    const limits = await this.budgetLimitRepository.findAllByBudgetId(budget.id);
    return { budget, limit: currentLimitOf(limits), created };
  }

  private async categoryBelongsToUser(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }

  private async listBelongsToUser(listId: string, userId: string): Promise<boolean> {
    const list = await this.prisma.transactionList.findFirst({ where: { id: listId, ownerId: userId }, select: { id: true } });
    return list !== null;
  }
}
