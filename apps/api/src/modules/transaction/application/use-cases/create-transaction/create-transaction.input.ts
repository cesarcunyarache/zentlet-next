import type { TransactionType } from '../../../domain/transaction/transaction.js';

export type CreateTransactionInput = {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description?: string | null;
  reference?: string | null;
  transactionDate: Date;
  listId?: string;
};
