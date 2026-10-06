import type { Prisma } from "@/generated/prisma/client";
import type { DateRange, TransactionFilters, TransactionSummary } from "../types";
import { toUTCISODate } from "@/lib/dates";

export const FEED_ORDER = [
  { transactionDate: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.TransactionOrderByWithRelationInput[];

function dateWhere({ from, to }: DateRange): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lt: new Date(to) } : {}),
  };
}

function searchWhere(q: string): Prisma.TransactionWhereInput {
  return {
    OR: [
      { description: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ],
  };
}

export function summaryWhere(userId: string, range: DateRange): Prisma.TransactionWhereInput {
  return { userId, transactionDate: dateWhere(range) };
}

export function feedWhere(userId: string, filters: TransactionFilters): Prisma.TransactionWhereInput {
  const { type, categoryId, q } = filters;
  return {
    ...summaryWhere(userId, filters),
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q ? searchWhere(q) : {}),
  };
}

interface Cursor {
  date: string;
  createdAt: string;
  id: string;
}

export function encodeCursor(row: { transactionDate: Date; createdAt: Date; id: string }) {
  const cursor: Cursor = {
    date: toUTCISODate(row.transactionDate),
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

const isDateString = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

function isCursor(value: Partial<Cursor>): value is Cursor {
  return isDateString(value.date) && isDateString(value.createdAt) && typeof value.id === "string";
}

export function decodeCursor(value: string): Cursor | null {
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString()) as Partial<Cursor>;
    return isCursor(cursor) ? cursor : null;
  } catch {
    return null;
  }
}

export function afterCursor({ date, createdAt, id }: Cursor): Prisma.TransactionWhereInput {
  const day = new Date(date);
  const created = new Date(createdAt);
  return {
    transactionDate: { lte: day },
    OR: [
      { transactionDate: { lt: day } },
      { transactionDate: day, createdAt: { lt: created } },
      { transactionDate: day, createdAt: created, id: { lt: id } },
    ],
  };
}

interface SummaryGroup {
  categoryId: string;
  type: string;
  _sum: { amount: { toString(): string } | null };
  _count: { _all: number };
}

function addGroup(summary: TransactionSummary, group: SummaryGroup) {
  const amount = Number(group._sum.amount?.toString() ?? 0);
  const totals = (summary.byCategory[group.categoryId] ??= { expense: 0, income: 0 });
  summary.count += group._count._all;
  if (group.type === "expense") {
    summary.expenseTotal += amount;
    totals.expense += amount;
  } else {
    summary.incomeTotal += amount;
    totals.income += amount;
  }
}

export function toSummary(groups: SummaryGroup[]): TransactionSummary {
  const summary: TransactionSummary = { count: 0, expenseTotal: 0, incomeTotal: 0, byCategory: {} };
  for (const group of groups) addGroup(summary, group);
  return summary;
}
