import type {
  DueRecurringTransaction,
  OccurrenceDraft,
  StartSeriesDraft,
  StartSeriesResult,
} from './recurring-transaction.js';

export abstract class RecurringTransactionRepository {
  abstract startSeries(draft: StartSeriesDraft): Promise<StartSeriesResult>;

  abstract findDueBy(date: Date): Promise<DueRecurringTransaction[]>;

  abstract recordOccurrences(id: string, occurrences: OccurrenceDraft[], nextDueDate: Date): Promise<number>;

  abstract deleteOwned(id: string, userId: string): Promise<boolean>;
}
