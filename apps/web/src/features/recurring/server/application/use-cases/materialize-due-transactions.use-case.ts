import { isoDateIn, toUTCISODate } from "@/lib/dates";
import { dueDatesThrough } from "../../../lib/schedule";
import type { RecurringTransaction } from "../../domain/entities/recurring-transaction.entity";
import type { BudgetMonitor, LocalCalendar, PrivateList, RecurringMonitor } from "../../domain/ports/recurring.ports";
import type { RecurringTransactionRepository } from "../../domain/repositories/recurring-transaction.repository";

const MAX_OCCURRENCES_PER_RUN = 60;
const FURTHEST_AHEAD_TIMEZONE = "Pacific/Kiritimati";

export class MaterializeDueTransactionsUseCase {
  constructor(
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    private readonly localCalendar: LocalCalendar,
    private readonly privateList: PrivateList,
    private readonly budgetMonitor: BudgetMonitor,
    private readonly recurringMonitor: RecurringMonitor,
  ) {}

  async execute(now = new Date()) {
    const latestToday = new Date(isoDateIn(FURTHEST_AHEAD_TIMEZONE, now));
    const dueRecurrings = await this.recurringTransactionRepository.findDueBy(latestToday);

    const totals = { created: 0, failed: 0 };
    for (const recurring of dueRecurrings) {
      try {
        totals.created += await this.materialize(recurring, now);
      } catch (error) {
        totals.failed++;
        this.recurringMonitor.materializeFailed(recurring.userId, error);
      }
    }

    return totals;
  }

  private async materialize(recurring: RecurringTransaction, now: Date) {
    const { id, userId, type, amount, description, categoryId, frequency } = recurring;

    const schedule = {
      anchorDate: toUTCISODate(recurring.anchorDate),
      frequency,
      nextDueDate: toUTCISODate(recurring.nextDueDate),
    };
    const userToday = await this.localCalendar.today(userId, now);
    const { dates, nextDueDate } = dueDatesThrough(schedule, userToday, MAX_OCCURRENCES_PER_RUN);
    if (dates.length === 0) return 0;

    const listId = await this.privateList.idFor(userId);
    const occurrences = dates.map((date) => ({
      userId,
      type,
      amount,
      description,
      categoryId,
      transactionDate: new Date(date),
      recurringTransactionId: id,
      listId,
    }));

    const createdCount = await this.recurringTransactionRepository.recordOccurrences(
      id,
      occurrences,
      new Date(nextDueDate),
    );

    const createdExpenses = createdCount > 0 && type === "expense";
    if (createdExpenses) this.budgetMonitor.scheduleCheck(userId, categoryId);

    return createdCount;
  }
}
