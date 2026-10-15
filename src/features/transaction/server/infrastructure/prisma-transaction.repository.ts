import prisma from "@/lib/prisma";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";
import type { Transaction as TransactionRow } from "@/generated/prisma/client";
import { FEED_ORDER, afterCursor, feedWhere, summaryWhere, toSummary } from "../../lib/feed-query";
import type { DateRange, TransactionFilters } from "../../types";
import type { FeedCursor, NewTransaction, TransactionChanges } from "../domain/transaction.entity";
import type { TransactionRepository } from "../domain/transaction.repository";
import { toDomain } from "./transaction.mapper";

const toDomainOrNull = (row: TransactionRow | null) => (row ? toDomain(row) : null);

export class PrismaTransactionRepository implements TransactionRepository {
  async findById(id: string) {
    return toDomainOrNull(await prisma.transaction.findUnique({ where: { id } }));
  }

  async findOwned(userId: string, id: string) {
    return toDomainOrNull(await prisma.transaction.findFirst({ where: { id, userId } }));
  }

  async findFeed(userId: string, filters: TransactionFilters, after: FeedCursor | null, take: number) {
    const where = feedWhere(userId, filters);
    const rows = await prisma.transaction.findMany({
      where: after ? { AND: [where, afterCursor(after)] } : where,
      orderBy: FEED_ORDER,
      take,
    });
    return rows.map(toDomain);
  }

  async summarize(userId: string, range: DateRange) {
    const groups = await prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: summaryWhere(userId, range),
      _sum: { amount: true },
      _count: { _all: true },
    });
    return toSummary(groups);
  }

  async findExistingIds(userId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await prisma.transaction.findMany({ where: { userId, id: { in: ids } }, select: { id: true } });
    return rows.map((row) => row.id);
  }

  async insert(transaction: NewTransaction) {
    try {
      return toDomain(await prisma.transaction.create({ data: transaction }));
    } catch (error) {
      if (isUniqueViolation(error)) return "id_taken" as const;
      throw error;
    }
  }

  async updateOwned(userId: string, id: string, changes: TransactionChanges) {
    try {
      const { count } = await prisma.transaction.updateMany({ where: { id, userId }, data: changes });
      if (count === 0) return "not_found" as const;
    } catch (error) {
      if (isForeignKeyViolation(error)) return "category_not_found" as const;
      throw error;
    }
    return toDomain(await prisma.transaction.findUniqueOrThrow({ where: { id } }));
  }

  async deleteOwned(userId: string, id: string) {
    const { count } = await prisma.transaction.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async categoryBelongsTo(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }
}
