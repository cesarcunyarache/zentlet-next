import { isUniqueViolation } from "@/lib/db-errors";
import { resolveTargetListId } from "@/lib/private-list";
import { scheduleBudgetCheck } from "@/features/budget/server/infrastructure/budget.monitor";
import { recurringUseCases } from "@/features/recurring/server/infrastructure/recurring.container";
import type { NewTransaction } from "../domain/entities/transaction.entity";
import type { BudgetMonitor, ListPlacement, RecurringSeries } from "../domain/ports/transaction.ports";
import type { TransactionType } from "../../types";

export const budgetMonitor: BudgetMonitor = {
  scheduleCheck: scheduleBudgetCheck,
};

export const listPlacement: ListPlacement = {
  targetFor: resolveTargetListId,
};

export const recurringSeries: RecurringSeries = {
  async start(transaction: NewTransaction, frequency) {
    try {
      const firstOccurrence = await recurringUseCases.start.execute(transaction, frequency);
      return { ...firstOccurrence, type: firstOccurrence.type as TransactionType };
    } catch (error) {
      if (isUniqueViolation(error)) return "id_taken" as const;
      throw error;
    }
  },
};
