import type { TransactionType } from "../../types";

export interface Transaction {
  id: string;
  userId: string;
  description: string | null;
  amount: number;
  type: TransactionType;
  categoryId: string;
  reference: string | null;
  transactionDate: Date;
  recurringTransactionId: string | null;
  createdAt: Date;
}

export interface NewTransaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  reference: string | null;
  transactionDate: Date;
}

export type TransactionChanges = Partial<
  Pick<Transaction, "description" | "amount" | "type" | "categoryId" | "reference" | "transactionDate">
>;

export interface FeedCursor {
  date: string;
  createdAt: string;
  id: string;
}

export const isExpense = (transaction: Pick<Transaction, "type">) => transaction.type === "expense";
