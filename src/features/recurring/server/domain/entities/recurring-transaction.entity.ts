import type { RecurrenceFrequency } from "../../../types";

export interface RecurringTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string | null;
  categoryId: string;
  frequency: RecurrenceFrequency;
  anchorDate: Date;
  nextDueDate: Date;
}

export interface TransactionSeed {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string;
  categoryId: string;
  reference: string | null;
  transactionDate: Date;
  listId: string;
}

export interface SeriesOccurrence {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string | null;
  categoryId: string;
  reference: string | null;
  transactionDate: Date;
  recurringTransactionId: string | null;
  listId: string;
  createdAt: Date;
}

export type OccurrenceDraft = Pick<
  RecurringTransaction,
  "userId" | "type" | "amount" | "description" | "categoryId"
> & {
  transactionDate: Date;
  recurringTransactionId: string;
  listId: string;
};
