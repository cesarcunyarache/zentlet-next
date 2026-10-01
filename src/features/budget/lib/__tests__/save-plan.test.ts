import { describe, expect, it } from "vitest";
import type { TBudget } from "../../types";
import { BUDGET_PERIODS } from "../period";
import { planBudgetSave } from "../save-plan";

const today = "2026-09-26";

const monthlyFood: TBudget = {
  id: "b1",
  categoryId: "food",
  kind: "recurring",
  ...BUDGET_PERIODS.monthly,
  startDate: "2026-07-01",
  limits: [{ effectiveFrom: "2026-07-01", amount: 600 }],
};

describe("planBudgetSave", () => {
  it("sin presupuesto, crea uno que empieza en el periodo actual", () => {
    const plan = planBudgetSave(undefined, { categoryId: "food", amount: 300, period: "weekly", kind: "recurring" }, today);

    expect(plan).toEqual({
      create: { categoryId: "food", kind: "recurring", periodUnit: "week", periodCount: 1, startDate: "2026-09-21", amount: 300 },
    });
  });

  it("mismo periodo y recurrencia: sólo cambia el tope desde el periodo actual", () => {
    const plan = planBudgetSave(monthlyFood, { categoryId: "food", amount: 800, period: "monthly", kind: "recurring" }, today);

    expect(plan).toEqual({ limit: { budgetId: "b1", effectiveFrom: "2026-09-01", amount: 800 } });
  });

  it("otro periodo: reemplaza el presupuesto por uno nuevo", () => {
    const plan = planBudgetSave(monthlyFood, { categoryId: "food", amount: 2000, period: "quarterly", kind: "recurring" }, today);

    expect(plan).toEqual({
      remove: "b1",
      create: { categoryId: "food", kind: "recurring", periodUnit: "month", periodCount: 3, startDate: "2026-07-01", amount: 2000 },
    });
  });

  it("pasar a una sola vez también lo reemplaza", () => {
    const plan = planBudgetSave(monthlyFood, { categoryId: "food", amount: 600, period: "monthly", kind: "once" }, today);

    expect(plan.remove).toBe("b1");
    expect(plan.create).toMatchObject({ kind: "once", startDate: "2026-09-01" });
  });

  it("uno de una sola vez que ya terminó se reemplaza aunque las opciones coincidan", () => {
    const expired: TBudget = { ...monthlyFood, kind: "once", startDate: "2026-08-01" };
    const plan = planBudgetSave(expired, { categoryId: "food", amount: 600, period: "monthly", kind: "once" }, today);

    expect(plan).toEqual({
      remove: "b1",
      create: { categoryId: "food", kind: "once", periodUnit: "month", periodCount: 1, startDate: "2026-09-01", amount: 600 },
    });
  });
});
