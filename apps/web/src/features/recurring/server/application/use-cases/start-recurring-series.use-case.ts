import { toUTCISODate } from "@/lib/dates";
import { nextOccurrenceAfter } from "../../../lib/schedule";
import type { RecurrenceFrequency } from "../../../types";
import type { TransactionSeed } from "../../domain/entities/recurring-transaction.entity";
import type { LocalCalendar } from "../../domain/ports/recurring.ports";
import type { RecurringTransactionRepository } from "../../domain/repositories/recurring-transaction.repository";

const laterOf = (a: string, b: string) => (a > b ? a : b);

export class StartRecurringSeriesUseCase {
  constructor(
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    private readonly localCalendar: LocalCalendar,
  ) {}

  async execute(seed: TransactionSeed, frequency: RecurrenceFrequency) {
    const nextDueDate = await this.firstDueDate(seed, frequency);
    return this.recurringTransactionRepository.startSeries(seed, frequency, nextDueDate);
  }

  private async firstDueDate(seed: TransactionSeed, frequency: RecurrenceFrequency) {
    const anchorDate = toUTCISODate(seed.transactionDate);
    const today = await this.localCalendar.today(seed.userId);
    const searchFrom = laterOf(anchorDate, today);
    return new Date(nextOccurrenceAfter(anchorDate, frequency, searchFrom));
  }
}
