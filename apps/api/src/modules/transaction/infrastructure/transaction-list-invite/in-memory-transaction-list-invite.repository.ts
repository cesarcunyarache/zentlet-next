import { Injectable } from '@nestjs/common';
import type { TransactionListMemberRepository } from '../../domain/transaction-list-member/transaction-list-member.repository.js';
import type {
  NewTransactionListInvite,
  StoredTransactionListInvite,
  TransactionListInvite,
} from '../../domain/transaction-list-invite/transaction-list-invite.js';
import { TransactionListInviteRepository } from '../../domain/transaction-list-invite/transaction-list-invite.repository.js';
import { isInviteUsable } from '../../domain/transaction-list-invite/transaction-list-invite.policy.js';

type StoredRow = StoredTransactionListInvite & { tokenHash: string };

@Injectable()
export class InMemoryTransactionListInviteRepository extends TransactionListInviteRepository {
  private readonly invites = new Map<string, StoredRow>();

  // Takes the member repository directly so accepting an invite creates the
  // membership in the same step, mirroring the single DB transaction Prisma's
  // `accept()` runs across both tables in production.
  constructor(private readonly memberRepository: TransactionListMemberRepository) {
    super();
  }

  async create(invite: NewTransactionListInvite): Promise<TransactionListInvite> {
    const stored: StoredRow = {
      id: invite.id,
      listId: invite.listId,
      role: invite.role,
      email: invite.email,
      expiresAt: invite.expiresAt,
      createdAt: new Date(),
      acceptedAt: null,
      revokedAt: null,
      tokenHash: invite.tokenHash,
    };
    this.invites.set(stored.id, stored);
    return toPublic(stored);
  }

  async findByTokenHash(tokenHash: string): Promise<StoredTransactionListInvite | null> {
    const row = [...this.invites.values()].find((invite) => invite.tokenHash === tokenHash);
    if (!row) return null;

    const { tokenHash: _tokenHash, ...stored } = row;
    return stored;
  }

  async findActive(listId: string, now: Date): Promise<TransactionListInvite[]> {
    return [...this.invites.values()]
      .filter((invite) => invite.listId === listId && isInviteUsable(invite, now))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toPublic);
  }

  async revoke(listId: string, inviteId: string, now: Date): Promise<'revoked' | 'not_revocable'> {
    const row = this.invites.get(inviteId);
    if (!row || row.listId !== listId || row.acceptedAt !== null || row.revokedAt !== null) {
      return 'not_revocable';
    }

    row.revokedAt = now;
    return 'revoked';
  }

  async accept(inviteId: string, userId: string, now: Date): Promise<'accepted' | 'not_usable'> {
    const row = this.invites.get(inviteId);
    if (!row || !isInviteUsable(row, now)) return 'not_usable';

    row.acceptedAt = now;
    await this.memberRepository.create(row.listId, userId, row.role);
    return 'accepted';
  }

  // Test helper — not part of the port, only used to set up fixtures.
  seedInvite(invite: StoredTransactionListInvite & { tokenHash: string }): void {
    this.invites.set(invite.id, invite);
  }
}

function toPublic(row: StoredRow): TransactionListInvite {
  return {
    id: row.id,
    listId: row.listId,
    role: row.role,
    email: row.email,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}
