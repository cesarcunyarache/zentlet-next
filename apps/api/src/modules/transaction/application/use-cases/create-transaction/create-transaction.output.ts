import type { Transaction } from '../../../domain/transaction/transaction.js';

export type CreateTransactionOutput = {
  transaction: Transaction;
  created: boolean;
};
