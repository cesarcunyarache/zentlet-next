import { toUTCISODate } from "@/lib/dates";
import type { TTransaction, TransactionType } from "../types";

interface TransactionRow {
  id: string;
  description: string | null;
  amount: { toString(): string };
  type: string;
  categoryId: string;
  transactionDate: Date;
  reference: string | null;
  recurringTransactionId: string | null;
}

export function serializeTransaction(row: TransactionRow): TTransaction {
  return {
    id: row.id,
    description: row.description ?? "",
    amount: Number(row.amount),
    type: row.type as TransactionType,
    categoryId: row.categoryId,
    transactionDate: toUTCISODate(row.transactionDate),
    reference: row.reference,
    recurringTransactionId: row.recurringTransactionId,
  };
}
