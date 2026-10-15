import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { ensurePrivateListId, moveToPrivateLists } from "@/lib/private-list";
import type { TransactionList as TransactionListRow } from "@/generated/prisma/client";
import { FEED_ORDER, afterCursor } from "@/features/transaction/lib/feed-query";
import type { TransactionType } from "@/features/transaction/types";
import type { ListTotals } from "../../types";
import type {
  EntryCursor,
  ListCategoryTotal,
  ListChanges,
  ListMemberTotal,
  NewTransactionList,
  TransactionList,
} from "../domain/list.entity";
import type { ListRepository } from "../domain/list.repository";

interface TypeTotals {
  expense: number;
  income: number;
  count: number;
}

interface TotalsGroup {
  type: string;
  _sum: { amount: { toString(): string } | null };
  _count: { _all: number };
}

export function toEntity(row: TransactionListRow): TransactionList {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    description: row.description,
    currency: row.currency,
    ownerId: row.ownerId,
    isPrivate: row.privateOwnerId !== null,
    createdAt: row.createdAt,
  };
}

function addGroup(totals: TypeTotals, group: TotalsGroup) {
  const amount = Number(group._sum.amount?.toString() ?? 0);
  totals.count += group._count._all;
  if (group.type === "expense") totals.expense += amount;
  else totals.income += amount;
}

function totalsBy<K extends string>(groups: (TotalsGroup & Record<K, string | null>)[], key: K) {
  const totals = new Map<string, TypeTotals>();
  for (const group of groups) {
    const id = group[key];
    if (!id) continue;
    const current = totals.get(id) ?? { expense: 0, income: 0, count: 0 };
    addGroup(current, group);
    totals.set(id, current);
  }
  return totals;
}

const EMPTY_TOTALS: TypeTotals = { expense: 0, income: 0, count: 0 };

const toListTotals = ({ expense, income, count }: TypeTotals): ListTotals => ({
  count,
  expenseTotal: expense,
  incomeTotal: income,
});

export class PrismaListRepository implements ListRepository {
  async findById(listId: string) {
    const row = await prisma.transactionList.findUnique({ where: { id: listId } });
    return row ? toEntity(row) : null;
  }

  async findOverviews(userId: string) {
    const memberships = await prisma.transactionListMember.findMany({
      where: { userId, list: { archivedAt: null } },
      include: { list: { include: { _count: { select: { members: true } } } } },
      orderBy: { list: { createdAt: "asc" } },
    });
    if (memberships.length === 0) return [];

    const groups = await prisma.transaction.groupBy({
      by: ["listId", "type"],
      where: { listId: { in: memberships.map((membership) => membership.listId) } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const totals = totalsBy(groups, "listId");

    const overviews = memberships.map(({ list, role }) => ({
      ...toEntity(list),
      ...toListTotals(totals.get(list.id) ?? EMPTY_TOTALS),
      role,
      memberCount: list._count.members,
    }));
    return overviews.sort((a, b) => Number(b.isPrivate) - Number(a.isPrivate));
  }

  async findBreakdown(listId: string) {
    const [byCategoryGroups, byUserGroups, members] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["categoryId", "type"],
        where: { listId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ["userId", "type"],
        where: { listId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.transactionListMember.findMany({
        where: { listId },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      }),
    ]);

    const categoryTotals = totalsBy(byCategoryGroups, "categoryId");
    const userTotals = totalsBy(byUserGroups, "userId");
    const categories = await prisma.category.findMany({
      where: { id: { in: [...categoryTotals.keys()] } },
      select: { id: true, name: true, icon: true, color: true },
    });

    const byCategory: ListCategoryTotal[] = categories.map((category) => {
      const { expense, income } = categoryTotals.get(category.id) ?? EMPTY_TOTALS;
      return { ...category, expense, income };
    });

    const memberTotals: ListMemberTotal[] = members.map(({ userId, role, user }) => ({
      userId,
      role,
      name: user.name,
      image: user.image,
      ...(userTotals.get(userId) ?? EMPTY_TOTALS),
    }));

    const overall = [...userTotals.values()].reduce(
      (sum, totals) => ({
        expense: sum.expense + totals.expense,
        income: sum.income + totals.income,
        count: sum.count + totals.count,
      }),
      EMPTY_TOTALS,
    );

    return { ...toListTotals(overall), memberCount: members.length, byCategory, members: memberTotals };
  }

  async findEntries(listId: string, after: EntryCursor | null, take: number) {
    const where = { listId };
    const rows = await prisma.transaction.findMany({
      where: after ? { AND: [where, afterCursor(after)] } : where,
      orderBy: FEED_ORDER,
      take,
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      description: row.description,
      amount: Number(row.amount),
      type: row.type as TransactionType,
      categoryId: row.categoryId,
      transactionDate: row.transactionDate,
      createdAt: row.createdAt,
      category: row.category,
    }));
  }

  async findEntryAuthor(listId: string, transactionId: string) {
    const row = await prisma.transaction.findFirst({
      where: { id: transactionId, listId },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }

  async findOwnedIds(ownerId: string) {
    const rows = await prisma.transactionList.findMany({ where: { ownerId }, select: { id: true } });
    return rows.map((row) => row.id);
  }

  async ensurePrivate(userId: string) {
    return ensurePrivateListId(userId);
  }

  async insert(list: NewTransactionList) {
    try {
      const row = await prisma.transactionList.create({
        data: { ...list, members: { create: { userId: list.ownerId, role: "owner" } } },
      });
      return toEntity(row);
    } catch (error) {
      if (isUniqueViolation(error)) return "id_taken" as const;
      throw error;
    }
  }

  async update(listId: string, changes: ListChanges) {
    return toEntity(await prisma.transactionList.update({ where: { id: listId }, data: changes }));
  }

  async delete(listId: string) {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { listId } }),
      prisma.transactionList.deleteMany({ where: { id: listId } }),
    ]);
  }

  async countOwnedTransactions(userId: string, transactionIds: string[]) {
    return prisma.transaction.count({ where: { userId, id: { in: transactionIds } } });
  }

  async assign(listId: string, userId: string, transactionIds: string[]) {
    const [{ count }] = await prisma.$transaction([
      prisma.transaction.updateMany({ where: { userId, id: { in: transactionIds } }, data: { listId } }),
      prisma.transactionList.update({ where: { id: listId }, data: { updatedAt: new Date() } }),
    ]);
    return count;
  }

  async unassign(listId: string, transactionId: string) {
    return (await moveToPrivateLists(prisma, { listId, transactionId })) > 0;
  }
}
