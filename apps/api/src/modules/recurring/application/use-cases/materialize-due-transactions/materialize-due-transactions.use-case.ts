import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../../shared/logger/domain/logger.js';
import type {
  DueRecurringTransaction,
  OccurrenceDraft,
} from '../../../domain/recurring-transaction/recurring-transaction.js';
import { RecurringTransactionRepository } from '../../../domain/recurring-transaction/recurring-transaction.repository.js';
import { MAX_OCCURRENCES_PER_RUN, dueDatesThrough, toUtcDateOnly } from '../../schedule/schedule.js';
import type { MaterializeDueTransactionsInput } from './materialize-due-transactions.input.js';
import type { MaterializeDueTransactionsOutput } from './materialize-due-transactions.output.js';

/**
 * Callable by a future cron/queue — this use case is transport-agnostic and
 * schedules nothing itself. Per-user-timezone "today" (as the real app's
 * `LocalCalendar` computes it) has no equivalent in this backend yet, so
 * "today" here is plain UTC. See the module report for why that is an
 * acceptable, deliberate simplification for now.
 */
@Injectable()
export class MaterializeDueTransactionsUseCase {
  constructor(
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: MaterializeDueTransactionsInput = {}): Promise<MaterializeDueTransactionsOutput> {
    const today = toUtcDateOnly(input.now ?? new Date());
    const dueTemplates = await this.recurringTransactionRepository.findDueBy(today);

    const totals = { created: 0, failed: 0 };
    for (const template of dueTemplates) {
      try {
        totals.created += await this.materialize(template, today);
      } catch (error) {
        totals.failed += 1;
        this.logger.error({ recurringTransactionId: template.id, error }, 'recurring.materialize_failed');
      }
    }

    return totals;
  }

  private async materialize(template: DueRecurringTransaction, today: Date): Promise<number> {
    const schedule = {
      anchorDate: template.anchorDate,
      frequency: template.frequency,
      nextDueDate: template.nextDueDate,
    };
    const { dates, nextDueDate } = dueDatesThrough(schedule, today, MAX_OCCURRENCES_PER_RUN);
    if (dates.length === 0) return 0;

    const occurrences: OccurrenceDraft[] = dates.map((transactionDate) => ({
      userId: template.userId,
      type: template.type,
      amount: template.amount,
      description: template.description,
      categoryId: template.categoryId,
      transactionDate,
      recurringTransactionId: template.id,
      listId: template.listId,
    }));

    return this.recurringTransactionRepository.recordOccurrences(template.id, occurrences, nextDueDate);
  }
}
