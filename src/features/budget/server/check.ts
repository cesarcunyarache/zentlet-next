import { after } from "next/server";
import prisma from "@/lib/prisma";
import { isoDateIn } from "@/lib/dates";
import { reportError } from "@/lib/observability/server";
import { notify } from "@/features/notification/server/notify";
import { preferencesSchema } from "@/features/preference/schemas/preference.schema";
import { dueBudgetNotice, noticeKeyPrefix } from "../lib/alerts";
import { activePeriod, limitAt } from "../lib/period";
import { BUDGET_LIMITS, serializeAlert, serializeBudget } from "../lib/serialize";
import type { PeriodRange } from "../types";

const loadBudget = (userId: string, categoryId: string) =>
  prisma.budget.findFirst({
    where: { userId, categoryId },
    include: { ...BUDGET_LIMITS, alerts: true, category: { select: { name: true } } },
  });

async function loadPreferences(userId: string) {
  const row = await prisma.userPreference.findUnique({ where: { userId }, select: { currency: true, timezone: true } });
  return preferencesSchema.pick({ currency: true, timezone: true }).parse(row ?? {});
}

async function spentIn(userId: string, categoryId: string, { from, to }: PeriodRange) {
  const { _sum } = await prisma.transaction.aggregate({
    where: { userId, categoryId, type: "expense", transactionDate: { gte: new Date(from), lt: new Date(to) } },
    _sum: { amount: true },
  });
  return Number(_sum.amount ?? 0);
}

async function sentKeys(userId: string, prefix: string) {
  const rows = await prisma.notification.findMany({
    where: { userId, dedupeKey: { startsWith: prefix } },
    select: { dedupeKey: true },
  });
  return rows.flatMap(({ dedupeKey }) => (dedupeKey ? [dedupeKey] : []));
}

export async function checkBudget(userId: string, categoryId: string) {
  const [row, { currency, timezone }] = await Promise.all([loadBudget(userId, categoryId), loadPreferences(userId)]);
  if (!row) return;

  const budget = serializeBudget(row);
  const period = activePeriod(budget, isoDateIn(timezone));
  const limit = period ? limitAt(budget, period.from) : null;
  if (!period || limit === null) return;

  const [spent, sent] = await Promise.all([
    spentIn(userId, categoryId, period),
    sentKeys(userId, noticeKeyPrefix(budget.id, period.from)),
  ]);
  const alerts = row.alerts.map(serializeAlert);
  const notice = dueBudgetNotice({ budgetId: budget.id, periodFrom: period.from, spent, limit, alerts, sentKeys: sent });
  if (!notice) return;

  const data = { budgetId: budget.id, categoryName: row.category.name, currency, spent, limit, periodFrom: period.from };
  await notify({ ...notice, userId, data });
}

export function scheduleBudgetCheck(userId: string, categoryId: string) {
  after(() =>
    checkBudget(userId, categoryId).catch((error) => reportError(error, "budget.check_failed", { userId, categoryId })),
  );
}
