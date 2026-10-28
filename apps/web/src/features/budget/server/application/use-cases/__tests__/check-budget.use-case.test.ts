import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetWithAlerts } from "../../../domain/entities/budget.entity";
import type { AccountPreferences, BudgetNotifier } from "../../../domain/ports/budget.ports";
import { CheckBudgetUseCase } from "../check-budget.use-case";
import { budget, fakeRepository } from "./fake-budget.repository";

const tracked: BudgetWithAlerts = {
  ...budget,
  alerts: [{ id: "a80", kind: "percent", value: 80 }],
  categoryName: "Comida",
};

const preferences: AccountPreferences = { find: vi.fn().mockResolvedValue({ currency: "PEN", timezone: "America/Lima" }) };

const notifier = (sentKeys: string[] = []): BudgetNotifier => ({
  sentKeys: vi.fn().mockResolvedValue(sentKeys),
  notify: vi.fn(),
});

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-01T03:00:00.000Z"), toFake: ["Date"] });
});

describe("CheckBudgetUseCase", () => {
  it("avisa la alerta alcanzada en el periodo del día local del usuario", async () => {
    const repository = fakeRepository({
      findByCategory: vi.fn().mockResolvedValue([tracked]),
      spentIn: vi.fn().mockResolvedValue(850),
    });
    const budgetNotifier = notifier();

    await new CheckBudgetUseCase(repository, preferences, budgetNotifier).execute("user-1", "food");

    expect(repository.spentIn).toHaveBeenCalledWith("user-1", "food", "list-1", { from: "2026-09-01", to: "2026-10-01" });
    expect(budgetNotifier.notify).toHaveBeenCalledWith({
      type: "budget.alert",
      dedupeKey: "budget:b1:2026-09-01:alert:a80",
      userId: "user-1",
      data: { budgetId: "b1", categoryName: "Comida", currency: "PEN", spent: 850, limit: 1000, periodFrom: "2026-09-01" },
    });
  });

  it("no repite lo ya enviado en el periodo", async () => {
    const repository = fakeRepository({
      findByCategory: vi.fn().mockResolvedValue([tracked]),
      spentIn: vi.fn().mockResolvedValue(1200),
    });
    const budgetNotifier = notifier(["budget:b1:2026-09-01:exceeded"]);

    await new CheckBudgetUseCase(repository, preferences, budgetNotifier).execute("user-1", "food");

    expect(budgetNotifier.notify).not.toHaveBeenCalled();
  });

  it("antes del inicio del presupuesto no mide nada", async () => {
    const future = { ...tracked, startDate: new Date("2026-11-01") };
    const repository = fakeRepository({ findByCategory: vi.fn().mockResolvedValue([future]) });

    await new CheckBudgetUseCase(repository, preferences, notifier()).execute("user-1", "food");

    expect(repository.spentIn).not.toHaveBeenCalled();
  });
});
