import type { TransactionListRole } from '../transaction-list/transaction-list.js';

export type TransactionListInviteRole = Exclude<TransactionListRole, 'owner'>;

export type TransactionListInvite = {
  id: string;
  listId: string;
  role: TransactionListInviteRole;
  email: string | null;
  expiresAt: Date;
  createdAt: Date;
};

export type NewTransactionListInvite = {
  id: string;
  listId: string;
  role: TransactionListInviteRole;
  email: string | null;
  tokenHash: string;
  createdById: string;
  expiresAt: Date;
};

export type StoredTransactionListInvite = TransactionListInvite & {
  acceptedAt: Date | null;
  revokedAt: Date | null;
};
