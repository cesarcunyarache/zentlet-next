import type { Prisma } from "@/generated/prisma/client";
import type { DateRange, TransactionFilters, TransactionSummary } from "../types";

/*
 * Consultas del feed de movimientos. Orden estable (fecha, alta, id) para
 * paginar por cursor: con OFFSET, una alta entre dos páginas duplicaría o
 * saltaría filas, y cada página sería más lenta que la anterior.
 */

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

export function summaryWhere(userId: string, range: DateRange): Prisma.TransactionWhereInput {
  return { userId, transactionDate: dateWhere(range) };
}

export function feedWhere(userId: string, filters: TransactionFilters): Prisma.TransactionWhereInput {
  const { type, categoryId, q } = filters;
  return {
    ...summaryWhere(userId, filters),
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { category: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

interface Cursor {
  date: string;
  createdAt: string;
  id: string;
}

export function encodeCursor(row: { transactionDate: Date; createdAt: Date; id: string }) {
  const cursor: Cursor = {
    date: row.transactionDate.toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** `null` si el cursor no es válido (manipulado o de otra versión). */
export function decodeCursor(value: string): Cursor | null {
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString()) as Partial<Cursor>;
    const valid =
      typeof cursor.date === "string" &&
      typeof cursor.createdAt === "string" &&
      typeof cursor.id === "string" &&
      !Number.isNaN(Date.parse(cursor.date)) &&
      !Number.isNaN(Date.parse(cursor.createdAt));
    return valid ? (cursor as Cursor) : null;
  } catch {
    return null;
  }
}

/** Filas estrictamente posteriores al cursor en el orden del feed. */
export function afterCursor({ date, createdAt, id }: Cursor): Prisma.TransactionWhereInput {
  const day = new Date(date);
  const created = new Date(createdAt);
  return {
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

export function toSummary(groups: SummaryGroup[]): TransactionSummary {
  const summary: TransactionSummary = { count: 0, expenseTotal: 0, incomeTotal: 0, byCategory: {} };

  for (const group of groups) {
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

  return summary;
}
