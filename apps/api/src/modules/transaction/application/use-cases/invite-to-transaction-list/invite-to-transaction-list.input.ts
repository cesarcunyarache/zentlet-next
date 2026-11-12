import type { TransactionListInviteRole } from '../../../domain/transaction-list-invite/transaction-list-invite.js';

export type InviteToTransactionListInput = {
  userId: string;
  listId: string;
  role: TransactionListInviteRole;
  email?: string | null;
};
