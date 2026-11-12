import type { TransactionPatch } from '../../../domain/transaction/transaction.js';

export type UpdateTransactionInput = {
  id: string;
  userId: string;
  patch: TransactionPatch;
};
