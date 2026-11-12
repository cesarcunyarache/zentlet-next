import type { TransactionListRole } from '../transaction-list/transaction-list.js';

export type TransactionListMember = {
  listId: string;
  userId: string;
  role: TransactionListRole;
  joinedAt: Date;
};
