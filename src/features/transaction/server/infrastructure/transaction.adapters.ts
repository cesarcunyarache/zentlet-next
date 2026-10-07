import { isUniqueViolation } from "@/lib/db-errors";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { createRepeatingTransaction } from "@/features/recurring/server/recurring";
import type { RecurrenceFrequency } from "@/features/recurring/types";
import type { NewTransaction } from "../domain/transaction.entity";
import type { BudgetMonitor, RecurringSeries } from "../domain/transaction.ports";
import { toEntity } from "./prisma-transaction.repository";

export const budgetMonitor: BudgetMonitor = {
  scheduleCheck: scheduleBudgetCheck,
};

export const recurringSeries: RecurringSeries = {
  async start(transaction: NewTransaction, frequency: RecurrenceFrequency) {
    try {
      return toEntity(await createRepeatingTransaction(transaction, frequency));
    } catch (error) {
      if (isUniqueViolation(error)) return "id_taken" as const;
      throw error;
    }
  },
};
