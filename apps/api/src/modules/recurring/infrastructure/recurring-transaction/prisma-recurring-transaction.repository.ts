import { Injectable } from '@nestjs/common';
import type { RecurringTransaction as RecurringTransactionRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type {
  DueRecurringTransaction,
  OccurrenceDraft,
  RecurringTransaction,
  StartSeriesDraft,
  StartSeriesResult,
} from '../../domain/recurring-transaction/recurring-transaction.js';
import { RecurringTransactionRepository } from '../../domain/recurring-transaction/recurring-transaction.repository.js';

function toDomain(row: RecurringTransactionRow): RecurringTransaction {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as RecurringTransaction['type'],
    amount: Number(row.amount),
    description: row.description,
    categoryId: row.categoryId,
    frequency: row.frequency,
    anchorDate: row.anchorDate,
    nextDueDate: row.nextDueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaRecurringTransactionRepository extends RecurringTransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async startSeries(draft: StartSeriesDraft): Promise<StartSeriesResult> {
    const [recurringRow, transactionRow] = await this.prisma.$transaction([
      this.prisma.recurringTransaction.create({
        data: {
          id: draft.id,
          type: draft.type,
          amount: draft.amount,
          description: draft.description,
          categoryId: draft.categoryId,
          frequency: draft.frequency,
          anchorDate: draft.anchorDate,
          nextDueDate: draft.nextDueDate,
          userId: draft.userId,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
      }),
      this.prisma.transaction.create({
        data: {
          id: draft.firstTransaction.id,
          type: draft.type,
          amount: draft.amount,
          description: draft.description,
          categoryId: draft.categoryId,
          transactionDate: draft.anchorDate,
          recurringTransactionId: draft.id,
          listId: draft.firstTransaction.listId,
          userId: draft.userId,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
      }),
    ]);

    return {
      recurringTransaction: toDomain(recurringRow),
      transactionId: transactionRow.id,
    };
  }

  async findDueBy(date: Date): Promise<DueRecurringTransaction[]> {
    const rows = await this.prisma.recurringTransaction.findMany({
      where: { nextDueDate: { lte: date } },
      include: {
        transactions: { orderBy: { transactionDate: 'asc' }, take: 1, select: { listId: true } },
      },
    });

    // Invariant: `startSeries` always creates the first `Transaction` row in
    // the same DB transaction as the template, so every template has one. A
    // template without any transaction cannot resolve a `listId` and is
    // skipped defensively rather than materializing into an unknown list.
    const due: DueRecurringTransaction[] = [];
    for (const row of rows) {
      const listId = row.transactions[0]?.listId;
      if (!listId) continue;
      due.push({ ...toDomain(row), listId });
    }
    return due;
  }

  async recordOccurrences(id: string, occurrences: OccurrenceDraft[], nextDueDate: Date): Promise<number> {
    const [{ count: createdCount }] = await this.prisma.$transaction([
      this.prisma.transaction.createMany({
        data: occurrences.map((occurrence) => ({
          id: crypto.randomUUID(),
          userId: occurrence.userId,
          type: occurrence.type,
          amount: occurrence.amount,
          description: occurrence.description,
          categoryId: occurrence.categoryId,
          transactionDate: occurrence.transactionDate,
          recurringTransactionId: occurrence.recurringTransactionId,
          listId: occurrence.listId,
        })),
        skipDuplicates: true,
      }),
      this.prisma.recurringTransaction.update({ where: { id }, data: { nextDueDate } }),
    ]);
    return createdCount;
  }

  async deleteOwned(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.recurringTransaction.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}
