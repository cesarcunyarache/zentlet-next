import { isUniqueViolation } from "@/lib/db-errors";
import { resolveTargetListId } from "@/lib/private-list";
import { scheduleBudgetCheck } from "@/features/budget/server/infrastructure/budget.monitor";
import { createRepeatingTransaction } from "@/features/recurring/server/recurring";
import type { RecurrenceFrequency } from "@/features/recurring/types";
import type { NewTransaction } from "../domain/entities/transaction.entity";
import type { BudgetMonitor, ListPlacement, RecurringSeries } from "../domain/ports/transaction.ports";
import { toDomain } from "./persistence/prisma/transaction.mapper";

export const budgetMonitor: BudgetMonitor = {
  scheduleCheck: scheduleBudgetCheck,
};

export const listPlacement: ListPlacement = {
  targetFor: resolveTargetListId,
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
