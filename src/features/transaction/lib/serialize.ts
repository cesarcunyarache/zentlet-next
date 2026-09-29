import type { TTransaction, TransactionType } from "../types";

const ISO_DATE_LENGTH = "YYYY-MM-DD".length;

interface TransactionRow {
  id: string;
  description: string | null;
  amount: { toString(): string };
  type: string;
  categoryId: string;
  transactionDate: Date;
  reference: string | null;
}

export function toUTCISODate(date: Date) {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
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
  };
}
