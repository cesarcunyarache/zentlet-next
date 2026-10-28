export const RECURRENCE_FREQUENCIES = ["WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export interface TRecurringTransaction {
  id: string;
  frequency: RecurrenceFrequency;
  nextDueDate: string;
}
