import type { RecurringTransaction } from '../../../domain/recurring-transaction/recurring-transaction.js';

export type StartRecurringSeriesOutput = {
  recurringTransaction: RecurringTransaction;
  transactionId: string;
};
