import type {
  RecurrenceFrequency,
  RecurringTransactionType,
} from '../../../domain/recurring-transaction/recurring-transaction.js';

export type StartRecurringSeriesInput = {
  id?: string;
  userId: string;
  type: RecurringTransactionType;
  amount: number;
  description?: string | null;
  categoryId: string;
  frequency: RecurrenceFrequency;
  anchorDate: Date;
  listId: string;
};
