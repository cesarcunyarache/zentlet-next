import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { ensurePrivateListId, moveToPrivateLists } from "@/lib/private-list";
import { FEED_ORDER, afterCursor } from "@/features/transaction/lib/feed-query";
import type {
  EntryCursor,
  ListCategoryTotal,
  ListChanges,
  ListMemberTotal,
  ListOverview,
  NewTransactionList,
} from "../../../domain/entities/list.entity";
import type { ListRepository } from "../../../domain/repositories/list.repository";
import { EMPTY_TOTALS, sumTotals, toListTotals, totalsBy } from "./list-totals";
import { toDomain, toEntry } from "./list.mapper";

const CATEGORY_SUMMARY = { id: true, name: true, icon: true, color: true } as const;

const privateListFirst = (a: ListOverview, b: ListOverview) => Number(b.isPrivate) - Number(a.isPrivate);

export class PrismaListRepository implements ListRepository {
  async findById(listId: string) {
    const row = await prisma.transactionList.findUnique({ where: { id: listId } });
    if (!row) return null;
    return toDomain(row);
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
    const totalsByList = totalsBy(groups, "listId");

    const overviews: ListOverview[] = memberships.map(({ list, role }) => ({
      ...toDomain(list),
      ...toListTotals(totalsByList.get(list.id) ?? EMPTY_TOTALS),
      role,
      memberCount: list._count.members,
    }));

    return overviews.sort(privateListFirst);
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

    const totalsByCategory = totalsBy(byCategoryGroups, "categoryId");
    const totalsByUser = totalsBy(byUserGroups, "userId");

    const categories = await prisma.category.findMany({
      where: { id: { in: [...totalsByCategory.keys()] } },
      select: CATEGORY_SUMMARY,
    });

    const byCategory: ListCategoryTotal[] = categories.map((category) => {
      const { expense, income } = totalsByCategory.get(category.id) ?? EMPTY_TOTALS;
      return { ...category, expense, income };
    });

    const memberTotals: ListMemberTotal[] = members.map(({ userId, role, user }) => ({
      userId,
      role,
      name: user.name,
      image: user.image,
      ...(totalsByUser.get(userId) ?? EMPTY_TOTALS),
    }));

    const overall = sumTotals(totalsByUser.values());

    return {
      ...toListTotals(overall),
      memberCount: members.length,
      byCategory,
      members: memberTotals,
    };
  }

  async findEntries(listId: string, after: EntryCursor | null, take: number) {
    const inList = { listId };
    const where = after ? { AND: [inList, afterCursor(after)] } : inList;

    const rows = await prisma.transaction.findMany({
      where,
      orderBy: FEED_ORDER,
      take,
      include: { category: { select: CATEGORY_SUMMARY } },
    });
    return rows.map(toEntry);
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

  ensurePrivate(userId: string) {
    return ensurePrivateListId(userId);
  }

  async insert(list: NewTransactionList) {
    try {
      const row = await prisma.transactionList.create({
        data: { ...list, members: { create: { userId: list.ownerId, role: "owner" } } },
      });
      return toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) return "id_taken" as const;
      throw error;
    }
  }

  async update(listId: string, changes: ListChanges) {
    const row = await prisma.transactionList.update({ where: { id: listId }, data: changes });
    return toDomain(row);
  }

  async delete(listId: string) {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { listId } }),
      prisma.transactionList.deleteMany({ where: { id: listId } }),
    ]);
  }

  countOwnedTransactions(userId: string, transactionIds: string[]) {
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
    await moveToPrivateLists(prisma, { listId, transactionId });
  }
}
