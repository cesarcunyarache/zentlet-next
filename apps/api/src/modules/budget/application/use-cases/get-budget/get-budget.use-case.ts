import { Injectable } from '@nestjs/common';
import { BudgetRepository } from '../../../domain/budget/budget.repository.js';
import { BudgetAlertRepository } from '../../../domain/budget-alert/budget-alert.repository.js';
import { BudgetLimitRepository } from '../../../domain/budget-limit/budget-limit.repository.js';
import { BudgetNotFoundError } from '../../../domain/budget.errors.js';
import type { GetBudgetInput } from './get-budget.input.js';
import type { GetBudgetOutput } from './get-budget.output.js';

@Injectable()
export class GetBudgetUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetLimitRepository: BudgetLimitRepository,
    private readonly budgetAlertRepository: BudgetAlertRepository,
  ) {}

  async execute(input: GetBudgetInput): Promise<GetBudgetOutput> {
    const budget =
      'id' in input
        ? await this.budgetRepository.findOwned(input.id, input.userId)
        : await this.budgetRepository.findOwnedByListAndCategory(input.userId, input.listId, input.categoryId);

    if (!budget) throw new BudgetNotFoundError('id' in input ? input.id : `${input.listId}:${input.categoryId}`);

    const [limits, alerts] = await Promise.all([
      this.budgetLimitRepository.findAllByBudgetId(budget.id),
      this.budgetAlertRepository.findAllByBudgetId(budget.id),
    ]);

    return { budget, limits, alerts };
  }
}
