import { Injectable } from '@nestjs/common';
import type { TransactionListMember as TransactionListMemberRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { TransactionListRole } from '../../domain/transaction-list/transaction-list.js';
import type { TransactionListMember } from '../../domain/transaction-list-member/transaction-list-member.js';
import { TransactionListMemberRepository } from '../../domain/transaction-list-member/transaction-list-member.repository.js';

function toDomain(row: TransactionListMemberRow): TransactionListMember {
  return {
    listId: row.listId,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt,
  };
}

@Injectable()
export class PrismaTransactionListMemberRepository extends TransactionListMemberRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async find(listId: string, userId: string): Promise<TransactionListMember | null> {
    const row = await this.prisma.transactionListMember.findUnique({ where: { listId_userId: { listId, userId } } });
    return row ? toDomain(row) : null;
  }

  async findAll(listId: string): Promise<TransactionListMember[]> {
    const rows = await this.prisma.transactionListMember.findMany({ where: { listId }, orderBy: { joinedAt: 'asc' } });
    return rows.map(toDomain);
  }

  async create(listId: string, userId: string, role: TransactionListRole): Promise<void> {
    await this.prisma.transactionListMember.create({ data: { listId, userId, role } });
  }

  async updateRole(listId: string, userId: string, role: TransactionListRole): Promise<void> {
    await this.prisma.transactionListMember.update({ where: { listId_userId: { listId, userId } }, data: { role } });
  }

  async remove(listId: string, userId: string): Promise<void> {
    await this.prisma.transactionListMember.deleteMany({ where: { listId, userId } });
  }

  async transferOwnership(listId: string, fromUserId: string, toUserId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.transactionList.update({ where: { id: listId }, data: { ownerId: toUserId } }),
      this.prisma.transactionListMember.update({
        where: { listId_userId: { listId, userId: toUserId } },
        data: { role: 'owner' },
      }),
      this.prisma.transactionListMember.deleteMany({ where: { listId, userId: fromUserId } }),
    ]);
  }
}
