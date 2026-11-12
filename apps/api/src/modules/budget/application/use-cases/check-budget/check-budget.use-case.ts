import { Injectable } from '@nestjs/common';
import { SummarizeTransactionsUseCase } from '../../../../transaction/application/use-cases/summarize-transactions/summarize-transactions.use-case.js';
import { BudgetRepository } from '../../../domain/budget/budget.repository.js';
import { BudgetAlertRepository } from '../../../domain/budget-alert/budget-alert.repository.js';
import { BudgetLimitRepository } from '../../../domain/budget-limit/budget-limit.repository.js';
import { BudgetNotifier } from '../../../domain/budget-notifier.js';
import { BudgetNotFoundError } from '../../../domain/budget.errors.js';
import { crossedAlert } from '../../rules/alert.rules.js';
import { activePeriod, fromISODate, limitAt, toISODate } from '../../rules/period.rules.js';
import type { CheckBudgetInput } from './check-budget.input.js';
import type { CheckBudgetOutput } from './check-budget.output.js';

const ONE_MS = 1;

@Injectable()
export class CheckBudgetUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetLimitRepository: BudgetLimitRepository,
    private readonly budgetAlertRepository: BudgetAlertRepository,
    private readonly summarizeTransactions: SummarizeTransactionsUseCase,
    private readonly budgetNotifier: BudgetNotifier,
  ) {}

  async execute(input: CheckBudgetInput, now = new Date()): Promise<CheckBudgetOutput> {
    const budget = await this.budgetRepository.findOwned(input.budgetId, input.userId);
    if (!budget) throw new BudgetNotFoundError(input.budgetId);

    const today = toISODate(now);
    const period = activePeriod(
      { kind: budget.kind, periodUnit: budget.periodUnit, periodCount: budget.periodCount, startDate: toISODate(budget.startDate) },
      today,
    );
    if (!period) return { checked: false };

    const limits = await this.budgetLimitRepository.findAllByBudgetId(budget.id);
    const limit = limitAt(
      toISODate(budget.startDate),
      limits.map((entry) => ({ effectiveFrom: toISODate(entry.effectiveFrom), amount: entry.amount })),
      period.from,
    );
    if (limit === null) return { checked: false };

    const [{ total: spent }, alerts] = await Promise.all([
      this.summarizeTransactions.execute({
        userId: budget.userId,
        type: 'expense',
        categoryId: budget.categoryId,
        listId: budget.listId,
        from: fromISODate(period.from),
        // `period.to` is the exclusive start of the NEXT period. The shared
        // SummarizeTransactionsUseCase filters with `lte`, not `lt`, so a
        // transaction dated exactly at that boundary would otherwise be
        // double-counted into both this period and the next one. Step back
        // one millisecond to make the inclusive upper bound land on the last
        // instant of this period instead.
        to: new Date(fromISODate(period.to).getTime() - ONE_MS),
      }),
      this.budgetAlertRepository.findAllByBudgetId(budget.id),
    ]);

    const crossed = crossedAlert(spent, limit, alerts);
    if (!crossed) return { checked: true, spent, limit, notified: false };

    await this.budgetNotifier.notify({
      userId: budget.userId,
      budgetId: budget.id,
      categoryId: budget.categoryId,
      periodFrom: period.from,
      spent,
      limit,
      notice: crossed,
    });

    return { checked: true, spent, limit, notified: true };
  }
}
