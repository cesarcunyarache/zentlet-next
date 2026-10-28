import { vi } from "vitest";
import type { Budget, NewBudget } from "../../../domain/entities/budget.entity";
import type { BudgetMonitor } from "../../../domain/ports/budget.ports";
import type { BudgetRepository } from "../../../domain/repositories/budget.repository";

export function stored(draft: NewBudget): Budget {
  return {
    id: draft.id,
    userId: draft.userId,
    categoryId: draft.categoryId,
    listId: draft.listId,
    kind: draft.kind,
    periodUnit: draft.periodUnit,
    periodCount: draft.periodCount,
    startDate: draft.startDate,
    limits: [{ effectiveFrom: draft.startDate, amount: draft.initialLimit }],
  };
}

export const budget: Budget = stored({
  id: "b1",
  userId: "user-1",
  categoryId: "food",
  listId: "list-1",
  kind: "recurring",
  periodUnit: "month",
  periodCount: 1,
  startDate: new Date("2026-09-01"),
  initialLimit: 1000,
  alerts: [],
});

export function fakeRepository(overrides: Partial<BudgetRepository> = {}): BudgetRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findOwned: vi.fn().mockResolvedValue(null),
    findSchedule: vi.fn().mockResolvedValue(null),
    findCurrentLimit: vi.fn().mockResolvedValue(null),
    findByCategory: vi.fn().mockResolvedValue([]),
    findAlerts: vi.fn().mockResolvedValue(null),
    insert: vi.fn(async (draft: NewBudget) => stored(draft)),
    setLimit: vi.fn().mockResolvedValue("saved"),
    replaceAlerts: vi.fn().mockResolvedValue([]),
    deleteOwned: vi.fn().mockResolvedValue("deleted"),
    categoryBelongsTo: vi.fn().mockResolvedValue(true),
    spentIn: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

export const fakeMonitor = (): BudgetMonitor => ({ scheduleCheck: vi.fn() });
