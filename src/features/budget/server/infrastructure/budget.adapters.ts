import prisma from "@/lib/prisma";
import { resolveTargetListId } from "@/lib/private-list";
import { notify } from "@/features/notification/server/notify";
import { preferencesSchema } from "@/features/preference/schemas/preference.schema";
import type { AccountPreferences, BudgetNotifier, ListPlacement } from "../domain/ports/budget.ports";

const budgetPreferencesSchema = preferencesSchema.pick({ currency: true, timezone: true });

export const listPlacement: ListPlacement = {
  async accepts(userId: string, listId: string) {
    const targetListId = await resolveTargetListId(userId, listId);
    return targetListId === listId;
  },
};

export const accountPreferences: AccountPreferences = {
  async find(userId: string) {
    const row = await prisma.userPreference.findUnique({ where: { userId }, select: { currency: true, timezone: true } });
    return budgetPreferencesSchema.parse(row ?? {});
  },
};

export const budgetNotifier: BudgetNotifier = {
  async sentKeys(userId: string, prefix: string) {
    const rows = await prisma.notification.findMany({
      where: { userId, dedupeKey: { startsWith: prefix } },
      select: { dedupeKey: true },
    });
    return rows.flatMap(({ dedupeKey }) => (dedupeKey ? [dedupeKey] : []));
  },
  notify,
};
