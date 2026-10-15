import { isUniqueViolation } from "@/lib/db-errors";
import { resolveTargetListId } from "@/lib/private-list";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { createRepeatingTransaction } from "@/features/recurring/server/recurring";
import type { RecurrenceFrequency } from "@/features/recurring/types";
import type { NewTransaction } from "../domain/transaction.entity";
import type { BudgetMonitor, ListPlacement, RecurringSeries } from "../domain/transaction.ports";
import { toDomain } from "./transaction.mapper";

export const budgetMonitor: BudgetMonitor = {
  scheduleCheck: scheduleBudgetCheck,
};

export const listPlacement: ListPlacement = {
  targetFor: (userId, requestedListId) => resolveTargetListId(userId, requestedListId),
};

export const recurringSeries: RecurringSeries = {
  async start(transaction: NewTransaction, frequency: RecurrenceFrequency) {
    try {
      return toDomain(await createRepeatingTransaction(transaction, frequency));
    } catch (error) {
      if (isUniqueViolation(error)) return "id_taken" as const;
      throw error;
    }
  },
};
