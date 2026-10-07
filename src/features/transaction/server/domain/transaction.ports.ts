import type { RecurrenceFrequency } from "@/features/recurring/types";
import type { NewTransaction, Transaction } from "./transaction.entity";

export interface BudgetMonitor {
  scheduleCheck(userId: string, categoryId: string): void;
}

export interface RecurringSeries {
  start(transaction: NewTransaction, frequency: RecurrenceFrequency): Promise<Transaction | "id_taken">;
}
