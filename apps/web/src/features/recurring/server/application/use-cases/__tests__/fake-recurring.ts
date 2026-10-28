import { vi } from "vitest";
import type { RecurringTransaction } from "../../../domain/entities/recurring-transaction.entity";
import type { BudgetMonitor, LocalCalendar, PrivateList, RecurringMonitor } from "../../../domain/ports/recurring.ports";
import type { RecurringTransactionRepository } from "../../../domain/repositories/recurring-transaction.repository";

export function recurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: "rec-1",
    userId: "user-1",
    type: "expense",
    amount: 45,
    description: "Netflix",
    categoryId: "streaming",
    frequency: "MONTHLY",
    anchorDate: new Date("2026-09-06"),
    nextDueDate: new Date("2026-10-06"),
    ...overrides,
  };
}

export function fakeRecurring(today = "2026-10-06") {
  const repository: RecurringTransactionRepository = {
    startSeries: vi.fn(async (seed) => ({ ...seed, recurringTransactionId: "rec-1", createdAt: new Date() })),
    findOwned: vi.fn().mockResolvedValue(null),
    findDueBy: vi.fn().mockResolvedValue([]),
    recordOccurrences: vi.fn(async (_id, occurrences) => occurrences.length),
    deleteOwned: vi.fn().mockResolvedValue("stopped"),
  };
  const calendar: LocalCalendar = { today: vi.fn().mockResolvedValue(today) };
  const privateList: PrivateList = { idFor: vi.fn().mockResolvedValue("private-list") };
  const budget: BudgetMonitor = { scheduleCheck: vi.fn() };
  const monitor: RecurringMonitor = { materializeFailed: vi.fn() };
  return { repository, calendar, privateList, budget, monitor };
}
