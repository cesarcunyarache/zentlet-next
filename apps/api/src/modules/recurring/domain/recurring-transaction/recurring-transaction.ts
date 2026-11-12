export type RecurringTransactionType = 'expense' | 'income';

export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';

export type RecurringTransaction = {
  id: string;
  userId: string;
  type: RecurringTransactionType;
  amount: number;
  description: string | null;
  categoryId: string;
  frequency: RecurrenceFrequency;
  anchorDate: Date;
  nextDueDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A due template plus the `listId` every one of its generated occurrences
 * must carry. `listId` is never a column on `recurring_transaction` itself,
 * so it is read back from the template's first generated `Transaction` row
 * (which `startSeries` always creates atomically alongside the template).
 */
export type DueRecurringTransaction = RecurringTransaction & { listId: string };

export type OccurrenceDraft = {
  userId: string;
  type: RecurringTransactionType;
  amount: number;
  description: string | null;
  categoryId: string;
  transactionDate: Date;
  recurringTransactionId: string;
  listId: string;
};

export type StartSeriesDraft = {
  id: string;
  userId: string;
  type: RecurringTransactionType;
  amount: number;
  description: string | null;
  categoryId: string;
  frequency: RecurrenceFrequency;
  anchorDate: Date;
  nextDueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  firstTransaction: {
    id: string;
    listId: string;
  };
};

export type StartSeriesResult = {
  recurringTransaction: RecurringTransaction;
  transactionId: string;
};
