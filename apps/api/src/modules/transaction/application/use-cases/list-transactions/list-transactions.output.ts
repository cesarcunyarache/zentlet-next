import type { Transaction } from '../../../domain/transaction/transaction.js';

export type ListTransactionsOutput = {
  transactions: Transaction[];
  nextCursor: string | null;
};
