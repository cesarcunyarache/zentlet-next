import { Injectable } from '@nestjs/common';
import { BudgetRepository } from '../../../domain/budget/budget.repository.js';
import { BudgetAlertRepository } from '../../../domain/budget-alert/budget-alert.repository.js';
import { BudgetLimitRepository } from '../../../domain/budget-limit/budget-limit.repository.js';
import { AlertAboveLimitError, BudgetNotFoundError } from '../../../domain/budget.errors.js';
import { isAlertBelowLimit } from '../../rules/alert.rules.js';
import { currentLimitOf } from '../../rules/budget-limit.rules.js';
import type { ReplaceBudgetAlertsInput } from './replace-budget-alerts.input.js';
import type { ReplaceBudgetAlertsOutput } from './replace-budget-alerts.output.js';

@Injectable()
export class ReplaceBudgetAlertsUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetLimitRepository: BudgetLimitRepository,
    private readonly budgetAlertRepository: BudgetAlertRepository,
  ) {}

  async execute(input: ReplaceBudgetAlertsInput): Promise<ReplaceBudgetAlertsOutput> {
    const budget = await this.budgetRepository.findOwned(input.budgetId, input.userId);
    if (!budget) throw new BudgetNotFoundError(input.budgetId);

    const limits = await this.budgetLimitRepository.findAllByBudgetId(budget.id);
    const currentLimit = currentLimitOf(limits);
    if (!currentLimit) throw new BudgetNotFoundError(input.budgetId);

    const allBelowLimit = input.alerts.every((alert) => isAlertBelowLimit(alert, currentLimit.amount));
    if (!allBelowLimit) throw new AlertAboveLimitError(input.budgetId);

    const alerts = await this.budgetAlertRepository.replaceAllForBudget(budget.id, input.alerts);
    return { alerts };
  }
}
