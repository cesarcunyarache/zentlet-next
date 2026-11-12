import type { NewTransactionListInvite, StoredTransactionListInvite, TransactionListInvite } from './transaction-list-invite.js';

export abstract class TransactionListInviteRepository {
  abstract create(invite: NewTransactionListInvite): Promise<TransactionListInvite>;

  abstract findByTokenHash(tokenHash: string): Promise<StoredTransactionListInvite | null>;

  abstract findActive(listId: string, now: Date): Promise<TransactionListInvite[]>;

  abstract revoke(listId: string, inviteId: string, now: Date): Promise<'revoked' | 'not_revocable'>;

  /** Marks the invite accepted and creates the membership row — one atomic step, mirroring the single DB transaction this spans in production. */
  abstract accept(inviteId: string, userId: string, now: Date): Promise<'accepted' | 'not_usable'>;
}
