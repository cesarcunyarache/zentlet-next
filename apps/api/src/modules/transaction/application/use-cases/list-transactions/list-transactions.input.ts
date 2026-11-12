import type { TransactionType } from '../../../domain/transaction/transaction.js';

export type ListTransactionsInput = {
  userId: string;
  type?: TransactionType;
  categoryId?: string;
  listId?: string;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
};
