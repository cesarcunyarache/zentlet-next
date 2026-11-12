import { Injectable } from '@nestjs/common';
import type { Prisma, Transaction as TransactionRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type {
  FeedCursor,
  Transaction,
  TransactionFilters,
  TransactionPatch,
} from '../../domain/transaction/transaction.js';
import { TransactionRepository } from '../../domain/transaction/transaction.repository.js';
import { isUniqueViolation } from '../db-errors.js';

function toDomain(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as Transaction['type'],
    amount: Number(row.amount),
    categoryId: row.categoryId,
    description: row.description,
    reference: row.reference,
    transactionDate: row.transactionDate,
    recurringTransactionId: row.recurringTransactionId,
    listId: row.listId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
  return {
    userId: filters.userId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.listId ? { listId: filters.listId } : {}),
    ...(filters.from || filters.to
      ? {
          transactionDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
}

/** Keyset pagination matching `ORDER BY transactionDate desc, createdAt desc, id desc`. */
function toCursorWhere(after: FeedCursor): Prisma.TransactionWhereInput {
  return {
    OR: [
      { transactionDate: { lt: after.transactionDate } },
      { transactionDate: after.transactionDate, createdAt: { lt: after.createdAt } },
      { transactionDate: after.transactionDate, createdAt: after.createdAt, id: { lt: after.id } },
    ],
  };
}

@Injectable()
export class PrismaTransactionRepository extends TransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(transaction: Transaction): Promise<Transaction | 'id_taken'> {
    try {
      const row = await this.prisma.transaction.create({
        data: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          description: transaction.description,
          reference: transaction.reference,
          transactionDate: transaction.transactionDate,
          recurringTransactionId: transaction.recurringTransactionId,
          listId: transaction.listId,
          userId: transaction.userId,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        },
      });
      return toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) return 'id_taken';
      throw error;
    }
  }

  async update(id: string, userId: string, patch: TransactionPatch): Promise<Transaction | null> {
    const { count } = await this.prisma.transaction.updateMany({ where: { id, userId }, data: patch });
    if (count === 0) return null;
    return this.findOwned(id, userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.transaction.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findOwned(id: string, userId: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findFirst({ where: { id, userId } });
    return row ? toDomain(row) : null;
  }

  async findFeed(filters: TransactionFilters, after: FeedCursor | null, take: number): Promise<Transaction[]> {
    const where: Prisma.TransactionWhereInput = after
      ? { AND: [toWhere(filters), toCursorWhere(after)] }
      : toWhere(filters);

    const rows = await this.prisma.transaction.findMany({
      where,
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
    return rows.map(toDomain);
  }

  async summarize(filters: TransactionFilters): Promise<{ total: number }> {
    const result = await this.prisma.transaction.aggregate({ where: toWhere(filters), _sum: { amount: true } });
    return { total: Number(result._sum.amount ?? 0) };
  }
}
