import { Injectable } from '@nestjs/common';
import { BudgetRepository } from '../../../domain/budget/budget.repository.js';
import { BudgetLimitRepository } from '../../../domain/budget-limit/budget-limit.repository.js';
import { BudgetNotFoundError, InvalidPeriodStartError, LimitBeforeStartDateError, SinglePeriodLimitError } from '../../../domain/budget.errors.js';
import { isPeriodStart, toISODate } from '../../rules/period.rules.js';
import type { SetBudgetLimitInput } from './set-budget-limit.input.js';
import type { SetBudgetLimitOutput } from './set-budget-limit.output.js';

@Injectable()
export class SetBudgetLimitUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetLimitRepository: BudgetLimitRepository,
  ) {}

  async execute(input: SetBudgetLimitInput): Promise<SetBudgetLimitOutput> {
    const budget = await this.budgetRepository.findOwned(input.budgetId, input.userId);
    if (!budget) throw new BudgetNotFoundError(input.budgetId);

    const effectiveFromISO = toISODate(input.effectiveFrom);
    const startDateISO = toISODate(budget.startDate);

    if (!isPeriodStart(budget, effectiveFromISO)) throw new InvalidPeriodStartError(effectiveFromISO);
    if (effectiveFromISO < startDateISO) throw new LimitBeforeStartDateError(effectiveFromISO, startDateISO);
    if (budget.kind === 'once' && effectiveFromISO !== startDateISO) throw new SinglePeriodLimitError(budget.id);

    const limit = await this.budgetLimitRepository.append({
      budgetId: budget.id,
      effectiveFrom: input.effectiveFrom,
      amount: input.amount,
    });

    return { limit };
  }
}
