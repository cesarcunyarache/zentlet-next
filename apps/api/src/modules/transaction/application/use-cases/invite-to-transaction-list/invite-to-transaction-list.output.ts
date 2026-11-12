import type { TransactionListInvite } from '../../../domain/transaction-list-invite/transaction-list-invite.js';

export type InviteToTransactionListOutput = {
  invite: TransactionListInvite;
  /** Plaintext token — returned exactly once; only its hash is ever persisted. */
  token: string;
};
