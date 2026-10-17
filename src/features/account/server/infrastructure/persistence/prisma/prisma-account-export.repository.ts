import prisma from "@/lib/prisma";
import { FEED_ORDER } from "@/features/transaction/lib/feed-query";
import type { AccountExportRepository } from "../../../domain/repositories/account-export.repository";

export class PrismaAccountExportRepository implements AccountExportRepository {
  async findData(userId: string) {
    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: FEED_ORDER,
        select: {
          transactionDate: true,
          type: true,
          amount: true,
          description: true,
          reference: true,
          category: { select: { name: true } },
        },
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: {
          name: true,
          icon: true,
          color: true,
          description: true,
          createdAt: true,
          _count: { select: { transactions: true } },
          budgets: {
            where: { list: { privateOwnerId: userId } },
            take: 1,
            select: {
              kind: true,
              periodUnit: true,
              periodCount: true,
              limits: { orderBy: { effectiveFrom: "desc" }, take: 1, select: { amount: true } },
            },
          },
        },
      }),
    ]);

    return {
      transactions,
      categories: categories.map(({ budgets, ...category }) => ({ ...category, budget: budgets[0] ?? null })),
    };
  }
}
