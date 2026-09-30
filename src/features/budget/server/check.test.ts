import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { notify } from "@/features/notification/server/notify";
import { checkBudget } from "./check";

vi.mock("@/lib/prisma", () => ({
  default: {
    budget: { findFirst: vi.fn() },
    userPreference: { findUnique: vi.fn() },
    transaction: { aggregate: vi.fn() },
    notification: { findMany: vi.fn() },
  },
}));
vi.mock("@/features/notification/server/notify", () => ({ notify: vi.fn() }));

const db = vi.mocked(prisma, { deep: true });

const budget = {
  id: "b1",
  categoryId: "food",
  kind: "recurring",
  periodUnit: "month",
  periodCount: 1,
  startDate: new Date("2026-01-01"),
  limits: [{ effectiveFrom: new Date("2026-01-01"), amount: "1000.00" }],
  alerts: [{ id: "a80", kind: "percent", value: "80.00" }],
  category: { name: "Comida" },
};

const spend = (amount: string | null) =>
  db.transaction.aggregate.mockResolvedValue({ _sum: { amount: amount && { toString: () => amount } } } as never);

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: new Date("2026-10-01T03:00:00.000Z"), toFake: ["Date"] });
  db.budget.findFirst.mockResolvedValue(budget as never);
  db.userPreference.findUnique.mockResolvedValue({ currency: "PEN", timezone: "America/Lima" } as never);
  db.notification.findMany.mockResolvedValue([]);
});

describe("checkBudget", () => {
  it("measures the period of the user's local day and notifies the reached alert", async () => {
    spend("850");

    await checkBudget("user-1", "food");

    expect(db.transaction.aggregate).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        categoryId: "food",
        type: "expense",
        transactionDate: { gte: new Date("2026-09-01"), lt: new Date("2026-10-01") },
      },
      _sum: { amount: true },
    });
    expect(notify).toHaveBeenCalledWith({
      type: "budget.alert",
      dedupeKey: "budget:b1:2026-09-01:alert:a80",
      userId: "user-1",
      data: { budgetId: "b1", categoryName: "Comida", currency: "PEN", spent: 850, limit: 1000, periodFrom: "2026-09-01" },
    });
  });

  it("does nothing without a budget for the category", async () => {
    db.budget.findFirst.mockResolvedValue(null);

    await checkBudget("user-1", "food");

    expect(db.transaction.aggregate).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does nothing below every threshold", async () => {
    spend(null);

    await checkBudget("user-1", "food");

    expect(notify).not.toHaveBeenCalled();
  });

  it("does not repeat what was already sent in the period", async () => {
    spend("1200");
    db.notification.findMany.mockResolvedValue([{ dedupeKey: "budget:b1:2026-09-01:exceeded" }] as never);

    await checkBudget("user-1", "food");

    expect(db.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", dedupeKey: { startsWith: "budget:b1:2026-09-01:" } },
      select: { dedupeKey: true },
    });
    expect(notify).not.toHaveBeenCalled();
  });
});
