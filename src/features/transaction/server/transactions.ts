import prisma from "@/lib/prisma";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { createRepeatingTransaction, type TransactionSeed } from "@/features/recurring/server/recurring";
import type {
  CreateTransactionInput,
  TransactionListQuery,
  TransactionSummaryQuery,
  UpdateTransactionInput,
} from "../schemas/transaction-api.schema";
import { FEED_ORDER, afterCursor, decodeCursor, encodeCursor, feedWhere, summaryWhere, toSummary } from "../lib/feed-query";
import { serializeTransaction } from "../lib/serialize";
import type { TransactionPage, TransactionSummaryResponse } from "../types";

export type TransactionError = "not_found" | "category_not_found" | "id_taken" | "invalid_cursor";

const fail = <E extends TransactionError>(error: E) => ({ error });

async function ownsCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
  return category !== null;
}

function checkBudgetIfExpense(userId: string, transaction: { type: string; categoryId: string }) {
  if (transaction.type === "expense") scheduleBudgetCheck(userId, transaction.categoryId);
}

export async function listTransactions(userId: string, query: TransactionListQuery) {
  const { cursor, limit, ...filters } = query;
  const after = cursor ? decodeCursor(cursor) : null;
  if (cursor && !after) return fail("invalid_cursor");

  const where = feedWhere(userId, filters);
  const rows = await prisma.transaction.findMany({
    where: after ? { AND: [where, afterCursor(after)] } : where,
    orderBy: FEED_ORDER,
    take: limit + 1,
  });

  const items = rows.slice(0, limit);
  const page: TransactionPage = {
    items: items.map(serializeTransaction),
    nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1]) : null,
  };
  return { page };
}

export async function summarizeTransactions(userId: string, query: TransactionSummaryQuery) {
  const { ids, ...range } = query;
  const [groups, present] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: summaryWhere(userId, range),
      _sum: { amount: true },
      _count: { _all: true },
    }),
    ids.length ? prisma.transaction.findMany({ where: { userId, id: { in: ids } }, select: { id: true } }) : [],
  ]);

  const summary: TransactionSummaryResponse = { ...toSummary(groups), presentIds: present.map((row) => row.id) };
  return summary;
}

export async function getTransaction(userId: string, id: string) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) return fail("not_found");
  return { transaction: serializeTransaction(transaction) };
}

async function existingWithId(userId: string, id: string) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return null;
  return existing.userId === userId ? { transaction: serializeTransaction(existing), created: false } : fail("id_taken");
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const { id, description, amount, type, categoryId, transactionDate, reference, recurrence } = input;

  const existing = await existingWithId(userId, id);
  if (existing) return existing;

  if (!(await ownsCategory(userId, categoryId))) return fail("category_not_found");

  const seed: TransactionSeed = {
    id,
    userId,
    description,
    amount,
    type,
    categoryId,
    reference: reference ?? null,
    transactionDate: new Date(transactionDate),
  };

  try {
    const transaction = recurrence
      ? await createRepeatingTransaction(seed, recurrence)
      : await prisma.transaction.create({ data: seed });
    checkBudgetIfExpense(userId, transaction);
    return { transaction: serializeTransaction(transaction), created: true };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const winner = await prisma.transaction.findFirst({ where: { id, userId } });
    return winner ? { transaction: serializeTransaction(winner), created: false } : fail("id_taken");
  }
}

export async function updateTransaction(userId: string, id: string, input: UpdateTransactionInput) {
  if (input.categoryId && !(await ownsCategory(userId, input.categoryId))) return fail("category_not_found");

  try {
    const { count } = await prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        description: input.description,
        amount: input.amount,
        type: input.type,
        categoryId: input.categoryId,
        reference: input.reference,
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : undefined,
      },
    });
    if (count === 0) return fail("not_found");
  } catch (error) {
    if (isForeignKeyViolation(error)) return fail("category_not_found");
    throw error;
  }

  const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id } });
  checkBudgetIfExpense(userId, transaction);
  return { transaction: serializeTransaction(transaction) };
}

export async function deleteTransaction(userId: string, id: string) {
  const { count } = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (count === 0) return fail("not_found");
  return { ok: true as const };
}
