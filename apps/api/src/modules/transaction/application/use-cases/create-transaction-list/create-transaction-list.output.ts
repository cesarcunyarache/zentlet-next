import type { TransactionList } from '../../../domain/transaction-list/transaction-list.js';

export type CreateTransactionListOutput = {
  list: TransactionList;
  created: boolean;
};
