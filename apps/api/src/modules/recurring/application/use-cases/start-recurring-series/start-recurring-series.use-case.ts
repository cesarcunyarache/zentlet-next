import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import { RecurringTransactionRepository } from '../../../domain/recurring-transaction/recurring-transaction.repository.js';
import { CategoryNotOwnedError, InvalidRecurringAmountError } from '../../../domain/recurring.errors.js';
import { nextOccurrenceAfter, toUtcDateOnly } from '../../schedule/schedule.js';
import type { StartRecurringSeriesInput } from './start-recurring-series.input.js';
import type { StartRecurringSeriesOutput } from './start-recurring-series.output.js';

@Injectable()
export class StartRecurringSeriesUseCase {
  constructor(
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: StartRecurringSeriesInput): Promise<StartRecurringSeriesOutput> {
    if (!(input.amount > 0)) throw new InvalidRecurringAmountError(input.amount);

    const ownsCategory = await this.categoryBelongsToUser(input.categoryId, input.userId);
    if (!ownsCategory) throw new CategoryNotOwnedError(input.categoryId);

    const anchorDate = toUtcDateOnly(input.anchorDate);
    const today = toUtcDateOnly(new Date());
    // A backdated anchor never backfills past periods: the first due date is
    // always the next occurrence strictly after both the anchor and today.
    const searchFrom = anchorDate.getTime() > today.getTime() ? anchorDate : today;
    const nextDueDate = nextOccurrenceAfter(anchorDate, input.frequency, searchFrom);

    const now = new Date();
    return this.recurringTransactionRepository.startSeries({
      id: input.id ?? crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      description: input.description ?? null,
      categoryId: input.categoryId,
      frequency: input.frequency,
      anchorDate,
      nextDueDate,
      createdAt: now,
      updatedAt: now,
      firstTransaction: {
        id: crypto.randomUUID(),
        listId: input.listId,
      },
    });
  }

  private async categoryBelongsToUser(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }
}
