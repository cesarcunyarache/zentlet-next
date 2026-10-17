import { describe, expect, it, vi } from "vitest";
import { DeleteBudgetUseCase } from "../delete-budget.use-case";
import { ListBudgetAlertsUseCase } from "../list-budget-alerts.use-case";
import { fakeRepository } from "./fake-budget.repository";

describe("DeleteBudgetUseCase", () => {
  it("borra el presupuesto del usuario", async () => {
    const repository = fakeRepository();

    expect(await new DeleteBudgetUseCase(repository).execute("user-1", "budget-1")).toEqual({ ok: true });
    expect(repository.deleteOwned).toHaveBeenCalledWith("user-1", "budget-1");
  });

  it("uno ajeno o inexistente es not_found", async () => {
    const repository = fakeRepository({ deleteOwned: vi.fn().mockResolvedValue("not_found") });

    expect(await new DeleteBudgetUseCase(repository).execute("user-1", "budget-1")).toEqual({ error: "not_found" });
  });
});

describe("ListBudgetAlertsUseCase", () => {
  it("devuelve las alertas del presupuesto del usuario", async () => {
    const alerts = [{ kind: "percent", value: 80 }];
    const repository = fakeRepository({ findAlerts: vi.fn().mockResolvedValue(alerts) });

    expect(await new ListBudgetAlertsUseCase(repository).execute("user-1", "budget-1")).toEqual({ alerts });
  });

  it("un presupuesto ajeno o inexistente es not_found", async () => {
    expect(await new ListBudgetAlertsUseCase(fakeRepository()).execute("user-1", "budget-1")).toEqual({
      error: "not_found",
    });
  });
});
