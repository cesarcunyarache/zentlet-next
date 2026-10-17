import prisma from "@/lib/prisma";
import { isoDateIn, toUTCISODate } from "@/lib/dates";
import { logger } from "@/lib/observability/logger";
import { ensurePrivateListId } from "@/lib/private-list";
import { scheduleBudgetCheck } from "@/features/budget/server/infrastructure/budget.monitor";
import { userLocalDate } from "@/features/preference/server/timezone";
import type { RecurringTransaction } from "@/generated/prisma/client";
import { dueDatesThrough } from "../lib/schedule";

const MAX_OCCURRENCES_PER_RUN = 60;
const FURTHEST_AHEAD_TIMEZONE = "Pacific/Kiritimati";

async function materialize(recurring: RecurringTransaction, now: Date) {
  const { id, userId, type, amount, description, categoryId, frequency } = recurring;

  const schedule = {
    anchorDate: toUTCISODate(recurring.anchorDate),
    frequency,
    nextDueDate: toUTCISODate(recurring.nextDueDate),
  };
  const userToday = await userLocalDate(userId, now);
  const { dates, nextDueDate } = dueDatesThrough(schedule, userToday, MAX_OCCURRENCES_PER_RUN);
  if (dates.length === 0) return 0;

  const listId = await ensurePrivateListId(userId);
  const occurrences = dates.map((date) => ({
    userId,
    type,
    amount,
    description,
    categoryId,
    transactionDate: new Date(date),
    recurringTransactionId: id,
    listId,
  }));

  const [{ count: createdCount }] = await prisma.$transaction([
    prisma.transaction.createMany({ data: occurrences, skipDuplicates: true }),
    prisma.recurringTransaction.update({ where: { id }, data: { nextDueDate: new Date(nextDueDate) } }),
  ]);

  const createdExpenses = createdCount > 0 && type === "expense";
  if (createdExpenses) scheduleBudgetCheck(userId, categoryId);

  return createdCount;
}

export async function materializeDueTransactions(now = new Date()) {
  const latestToday = new Date(isoDateIn(FURTHEST_AHEAD_TIMEZONE, now));
  const dueRecurrings = await prisma.recurringTransaction.findMany({ where: { nextDueDate: { lte: latestToday } } });

  const totals = { created: 0, failed: 0 };

  for (const recurring of dueRecurrings) {
    try {
      totals.created += await materialize(recurring, now);
    } catch (error) {
      totals.failed++;
      logger.error({ userId: recurring.userId, err: error }, "recurring.materialize_failed");
    }
  }

  return totals;
}
