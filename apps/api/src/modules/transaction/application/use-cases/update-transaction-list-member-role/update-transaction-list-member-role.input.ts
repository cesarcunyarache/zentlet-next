import type { TransactionListInviteRole } from '../../../domain/transaction-list-invite/transaction-list-invite.js';

export type UpdateTransactionListMemberRoleInput = {
  userId: string;
  listId: string;
  memberId: string;
  role: TransactionListInviteRole;
};
