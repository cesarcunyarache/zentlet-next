import prisma from "@/lib/prisma";
import type { RecurrenceFrequency } from "../../../../types";
import type { OccurrenceDraft, TransactionSeed } from "../../../domain/entities/recurring-transaction.entity";
import type { RecurringTransactionRepository } from "../../../domain/repositories/recurring-transaction.repository";
import { toRecurringTransaction, toSeriesOccurrence } from "./recurring-transaction.mapper";

export class PrismaRecurringTransactionRepository implements RecurringTransactionRepository {
  async startSeries(seed: TransactionSeed, frequency: RecurrenceFrequency, nextDueDate: Date) {
    const { userId, type, amount, description, categoryId, transactionDate } = seed;

    const firstOccurrence = await prisma.$transaction(async (tx) => {
      const recurring = await tx.recurringTransaction.create({
        data: { userId, type, amount, description, categoryId, frequency, anchorDate: transactionDate, nextDueDate },
      });
      return tx.transaction.create({ data: { ...seed, recurringTransactionId: recurring.id } });
    });

    return toSeriesOccurrence(firstOccurrence);
  }

  async findOwned(userId: string, id: string) {
    const row = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!row) return null;
    return toRecurringTransaction(row);
  }

  async findDueBy(date: Date) {
    const rows = await prisma.recurringTransaction.findMany({ where: { nextDueDate: { lte: date } } });
    return rows.map(toRecurringTransaction);
  }

  async recordOccurrences(id: string, occurrences: OccurrenceDraft[], nextDueDate: Date) {
    const [{ count: createdCount }] = await prisma.$transaction([
      prisma.transaction.createMany({ data: occurrences, skipDuplicates: true }),
      prisma.recurringTransaction.update({ where: { id }, data: { nextDueDate } }),
    ]);
    return createdCount;
  }

  async deleteOwned(userId: string, id: string) {
    const { count } = await prisma.recurringTransaction.deleteMany({ where: { id, userId } });
    if (count === 0) return "not_found" as const;
    return "stopped" as const;
  }
}
