import type { Transaction as TransactionRow } from "@/generated/prisma/client";
import type { TransactionType } from "../../types";
import type { Transaction } from "../domain/transaction.entity";

export function toDomain(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    description: row.description,
    amount: Number(row.amount),
    type: row.type as TransactionType,
    categoryId: row.categoryId,
    reference: row.reference,
    transactionDate: row.transactionDate,
    recurringTransactionId: row.recurringTransactionId,
    listId: row.listId,
    createdAt: row.createdAt,
  };
}
