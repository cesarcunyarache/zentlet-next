import { describe, expect, it, vi } from "vitest";
import { ReplaceBudgetAlertsUseCase } from "../replace-budget-alerts.use-case";
import { fakeMonitor, fakeRepository } from "./fake-budget.repository";

const saved = [{ id: "a1", kind: "percent" as const, value: 90 }];

const withLimit = () =>
  fakeRepository({
    findCurrentLimit: vi.fn().mockResolvedValue({ categoryId: "food", currentLimit: 1000 }),
    replaceAlerts: vi.fn().mockResolvedValue(saved),
  });

describe("ReplaceBudgetAlertsUseCase", () => {
  it("reemplaza las alertas y vuelve a revisar el presupuesto", async () => {
    const repository = withLimit();
    const monitor = fakeMonitor();

    const result = await new ReplaceBudgetAlertsUseCase(repository, monitor).execute("user-1", "b1", {
      alerts: [{ kind: "percent", value: 90 }],
    });

    expect(result).toEqual({ alerts: saved });
    expect(repository.replaceAlerts).toHaveBeenCalledWith("b1", [{ kind: "percent", value: 90 }]);
    expect(monitor.scheduleCheck).toHaveBeenCalledWith("user-1", "food");
  });

  it("una alerta igual o mayor al tope es alert_above_limit", async () => {
    const repository = withLimit();

    expect(
      await new ReplaceBudgetAlertsUseCase(repository, fakeMonitor()).execute("user-1", "b1", {
        alerts: [{ kind: "amount", value: 1000 }],
      }),
    ).toEqual({ error: "alert_above_limit" });
    expect(repository.replaceAlerts).not.toHaveBeenCalled();
  });

  it("un presupuesto ajeno es not_found", async () => {
    const repository = fakeRepository();

    expect(
      await new ReplaceBudgetAlertsUseCase(repository, fakeMonitor()).execute("user-1", "b1", { alerts: [] }),
    ).toEqual({ error: "not_found" });
  });
});
