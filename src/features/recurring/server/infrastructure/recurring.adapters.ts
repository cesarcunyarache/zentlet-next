import { logger } from "@/lib/observability/logger";
import { ensurePrivateListId } from "@/lib/private-list";
import { scheduleBudgetCheck } from "@/features/budget/server/infrastructure/budget.monitor";
import { preferenceUseCases } from "@/features/preference/server/infrastructure/preference.container";
import type { BudgetMonitor, LocalCalendar, PrivateList, RecurringMonitor } from "../domain/ports/recurring.ports";

export const localCalendar: LocalCalendar = {
  today: (userId, at) => preferenceUseCases.localDate.execute(userId, at),
};

export const privateList: PrivateList = {
  idFor: (userId) => ensurePrivateListId(userId),
};

export const budgetMonitor: BudgetMonitor = {
  scheduleCheck: (userId, categoryId) => scheduleBudgetCheck(userId, categoryId),
};

export const recurringMonitor: RecurringMonitor = {
  materializeFailed: (userId, error) => logger.error({ userId, err: error }, "recurring.materialize_failed"),
};
