import prisma from "@/lib/prisma";
import { isoDateIn, toUTCISODate } from "@/lib/dates";
import { logger } from "@/lib/observability/logger";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { userLocalDate } from "@/features/preference/server/timezone";
import type { RecurringTransaction } from "@/generated/prisma/client";
import { dueDatesThrough } from "../lib/schedule";

const MAX_OCCURRENCES_PER_RUN = 60;
const FURTHEST_AHEAD_TIMEZONE = "Pacific/Kiritimati";

async function materialize(recurring: RecurringTransaction, now: Date) {
  const { id, userId, type, amount, description, categoryId, frequency } = recurring;
  const schedule = { anchorDate: toUTCISODate(recurring.anchorDate), frequency, nextDueDate: toUTCISODate(recurring.nextDueDate) };
  const { dates, nextDueDate } = dueDatesThrough(schedule, await userLocalDate(userId, now), MAX_OCCURRENCES_PER_RUN);
  if (!dates.length) return 0;

  const rows = dates.map((date) => ({
    userId,
    type,
    amount,
    description,
    categoryId,
    transactionDate: new Date(date),
    recurringTransactionId: id,
  }));
  const [{ count }] = await prisma.$transaction([
    prisma.transaction.createMany({ data: rows, skipDuplicates: true }),
    prisma.recurringTransaction.update({ where: { id }, data: { nextDueDate: new Date(nextDueDate) } }),
  ]);
  if (count > 0 && type === "expense") scheduleBudgetCheck(userId, categoryId);
  return count;
}

export async function materializeDueTransactions(now = new Date()) {
  const latestToday = new Date(isoDateIn(FURTHEST_AHEAD_TIMEZONE, now));
  const due = await prisma.recurringTransaction.findMany({ where: { nextDueDate: { lte: latestToday } } });
  const totals = { created: 0, failed: 0 };
  for (const recurring of due) {
    try {
      totals.created += await materialize(recurring, now);
    } catch (error) {
      totals.failed++;
      logger.error({ userId: recurring.userId, err: error }, "recurring.materialize_failed");
    }
  }
  return totals;
}
