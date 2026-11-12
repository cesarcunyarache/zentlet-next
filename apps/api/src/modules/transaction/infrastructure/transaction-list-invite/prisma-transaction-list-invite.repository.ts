import { Injectable } from '@nestjs/common';
import type { TransactionListInvite as TransactionListInviteRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type {
  NewTransactionListInvite,
  StoredTransactionListInvite,
  TransactionListInvite,
} from '../../domain/transaction-list-invite/transaction-list-invite.js';
import { TransactionListInviteRepository } from '../../domain/transaction-list-invite/transaction-list-invite.repository.js';

function toDomain(row: TransactionListInviteRow): TransactionListInvite {
  return {
    id: row.id,
    listId: row.listId,
    role: row.role as TransactionListInvite['role'],
    email: row.email,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

const usableInvite = (now: Date) => ({ acceptedAt: null, revokedAt: null, expiresAt: { gt: now } });

@Injectable()
export class PrismaTransactionListInviteRepository extends TransactionListInviteRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(invite: NewTransactionListInvite): Promise<TransactionListInvite> {
    const row = await this.prisma.transactionListInvite.create({ data: invite });
    return toDomain(row);
  }

  async findByTokenHash(tokenHash: string): Promise<StoredTransactionListInvite | null> {
    const row = await this.prisma.transactionListInvite.findUnique({ where: { tokenHash } });
    if (!row) return null;

    return { ...toDomain(row), acceptedAt: row.acceptedAt, revokedAt: row.revokedAt };
  }

  async findActive(listId: string, now: Date): Promise<TransactionListInvite[]> {
    const rows = await this.prisma.transactionListInvite.findMany({
      where: { listId, ...usableInvite(now) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async revoke(listId: string, inviteId: string, now: Date): Promise<'revoked' | 'not_revocable'> {
    const { count } = await this.prisma.transactionListInvite.updateMany({
      where: { id: inviteId, listId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    if (count === 0) return 'not_revocable';
    return 'revoked';
  }

  async accept(inviteId: string, userId: string, now: Date): Promise<'accepted' | 'not_usable'> {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.transactionListInvite.findUnique({ where: { id: inviteId } });
      if (!invite) return 'not_usable' as const;

      const { count } = await tx.transactionListInvite.updateMany({
        where: { id: inviteId, ...usableInvite(now) },
        data: { acceptedAt: now },
      });
      if (count === 0) return 'not_usable' as const;

      await tx.transactionListMember.create({ data: { listId: invite.listId, userId, role: invite.role } });
      return 'accepted' as const;
    });
  }
}
