import { Injectable } from '@nestjs/common';
import type { TransactionList as TransactionListRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { ListMembership, NewTransactionList, TransactionList } from '../../domain/transaction-list/transaction-list.js';
import { TransactionListRepository } from '../../domain/transaction-list/transaction-list.repository.js';
import { isUniqueViolation } from '../db-errors.js';

const PRIVATE_LIST_DEFAULTS = { name: 'Private list', icon: '🔒', color: '#E2E8F0' };

// The Preference module doesn't exist yet in this backend, so the private
// list's starting currency is fixed here instead of read from a user setting.
const DEFAULT_CURRENCY = 'PEN';

function toDomain(row: TransactionListRow): TransactionList {
  return {
    id: row.id,
    ownerId: row.ownerId,
    privateOwnerId: row.privateOwnerId,
    currency: row.currency,
    name: row.name,
    icon: row.icon,
    color: row.color,
  };
}

@Injectable()
export class PrismaTransactionListRepository extends TransactionListRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPrivateList(userId: string): Promise<TransactionList | null> {
    const row = await this.prisma.transactionList.findUnique({ where: { privateOwnerId: userId } });
    return row ? toDomain(row) : null;
  }

  async ensurePrivateList(userId: string): Promise<TransactionList> {
    const existing = await this.findPrivateList(userId);
    if (existing) return existing;

    try {
      const created = await this.prisma.transactionList.create({
        data: {
          ...PRIVATE_LIST_DEFAULTS,
          currency: DEFAULT_CURRENCY,
          ownerId: userId,
          privateOwnerId: userId,
          members: { create: { userId, role: 'owner' } },
        },
      });
      return toDomain(created);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await this.findPrivateList(userId);
        if (raced) return raced;
      }
      throw error;
    }
  }

  async findMembership(listId: string, userId: string): Promise<ListMembership | null> {
    const membership = await this.prisma.transactionListMember.findUnique({
      where: { listId_userId: { listId, userId } },
      select: {
        role: true,
        list: { select: { currency: true, privateOwnerId: true, archivedAt: true } },
      },
    });
    if (!membership) return null;

    return {
      role: membership.role,
      list: membership.list,
    };
  }

  async findById(listId: string): Promise<TransactionList | null> {
    const row = await this.prisma.transactionList.findUnique({ where: { id: listId } });
    return row ? toDomain(row) : null;
  }

  async create(list: NewTransactionList): Promise<TransactionList | 'id_taken'> {
    try {
      const created = await this.prisma.transactionList.create({
        data: {
          id: list.id,
          name: list.name,
          icon: list.icon,
          color: list.color,
          currency: list.currency,
          ownerId: list.ownerId,
          members: { create: { userId: list.ownerId, role: 'owner' } },
        },
      });
      return toDomain(created);
    } catch (error) {
      if (isUniqueViolation(error)) return 'id_taken';
      throw error;
    }
  }
}
