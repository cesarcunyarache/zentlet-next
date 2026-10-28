import type {
  RecurringTransaction as RecurringRow,
  Transaction as TransactionRow,
} from "@/generated/prisma/client";
import type { RecurringTransaction, SeriesOccurrence } from "../../../domain/entities/recurring-transaction.entity";

export function toRecurringTransaction(row: RecurringRow): RecurringTransaction {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    categoryId: row.categoryId,
    frequency: row.frequency,
    anchorDate: row.anchorDate,
    nextDueDate: row.nextDueDate,
  };
}

export function toSeriesOccurrence(row: TransactionRow): SeriesOccurrence {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    categoryId: row.categoryId,
    reference: row.reference,
    transactionDate: row.transactionDate,
    recurringTransactionId: row.recurringTransactionId,
    listId: row.listId,
    createdAt: row.createdAt,
  };
}
