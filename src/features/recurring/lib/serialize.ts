import { toUTCISODate } from "@/lib/dates";
import type { RecurrenceFrequency, TRecurringTransaction } from "../types";

interface RecurringRow {
  id: string;
  frequency: RecurrenceFrequency;
  nextDueDate: Date;
}

export function serializeRecurringTransaction(row: RecurringRow): TRecurringTransaction {
  return { id: row.id, frequency: row.frequency, nextDueDate: toUTCISODate(row.nextDueDate) };
}
