import type { RecurrenceFrequency } from "../../../types";
import type {
  OccurrenceDraft,
  RecurringTransaction,
  SeriesOccurrence,
  TransactionSeed,
} from "../entities/recurring-transaction.entity";

export interface RecurringTransactionRepository {
  startSeries(seed: TransactionSeed, frequency: RecurrenceFrequency, nextDueDate: Date): Promise<SeriesOccurrence>;

  findOwned(userId: string, id: string): Promise<RecurringTransaction | null>;

  findDueBy(date: Date): Promise<RecurringTransaction[]>;

  recordOccurrences(id: string, occurrences: OccurrenceDraft[], nextDueDate: Date): Promise<number>;

  deleteOwned(userId: string, id: string): Promise<"stopped" | "not_found">;
}
