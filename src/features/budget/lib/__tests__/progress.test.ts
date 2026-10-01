import { describe, expect, it } from "vitest";
import type { TBudget } from "../types";
import { BUDGET_PERIODS } from "./period";
import { budgetMeasurements, budgetPreview, daysLeft, periodRangeLabel, spentPercent } from "./progress";

const today = "2026-09-26";
const thisMonth = { from: "2026-09-01", to: "2026-10-01" };

const food: TBudget = {
  id: "b-food",
  categoryId: "food",
  kind: "recurring",
  ...BUDGET_PERIODS.monthly,
  startDate: "2026-08-01",
  limits: [
    { effectiveFrom: "2026-08-01", amount: 600 },
    { effectiveFrom: "2026-09-01", amount: 800 },
  ],
};
const taxi: TBudget = {
  id: "b-taxi",
  categoryId: "taxi",
  kind: "recurring",
  ...BUDGET_PERIODS.weekly,
  startDate: "2026-09-07",
  limits: [{ effectiveFrom: "2026-09-07", amount: 50 }],
};

describe("budgetMeasurements", () => {
  it("cada presupuesto se mide en su periodo con el tope vigente en él", () => {
    expect(budgetMeasurements([food, taxi], thisMonth, today)).toEqual([
      { categoryId: "food", range: thisMonth, limit: 800 },
      { categoryId: "taxi", range: { from: "2026-09-21", to: "2026-09-28" }, limit: 50 },
    ]);
  });

  it("en el mes pasado, el mensual usa el tope de entonces y el semanal no aparece", () => {
    expect(budgetMeasurements([food, taxi], { from: "2026-08-01", to: "2026-09-01" }, today)).toEqual([
      { categoryId: "food", range: { from: "2026-08-01", to: "2026-09-01" }, limit: 600 },
    ]);
  });

  it("los que no están vigentes no se miden", () => {
    const expired: TBudget = { ...taxi, kind: "once", startDate: "2026-09-07" };
    expect(budgetMeasurements([expired], thisMonth, today)).toEqual([]);
  });
});

describe("budgetPreview", () => {
  it("dentro del tope: fracción gastada y lo que queda", () => {
    expect(budgetPreview(30, 50)).toEqual({ ratio: 0.6, remaining: 20, excess: 0 });
  });

  it("superado: la barra se queda llena y se indica el exceso", () => {
    expect(budgetPreview(80, 50)).toEqual({ ratio: 1, remaining: 0, excess: 30 });
  });

  it("sin tope todavía no hay vista previa", () => {
    expect(budgetPreview(30, 0)).toBeNull();
  });
});

describe("spentPercent", () => {
  it("redondea el porcentaje gastado del tope, también por encima de 100", () => {
    expect(spentPercent(333, 1000)).toBe(33);
    expect(spentPercent(150, 100)).toBe(150);
  });

  it("sin tope es 0", () => {
    expect(spentPercent(50, 0)).toBe(0);
  });
});

describe("daysLeft", () => {
  it("cuenta los días que faltan incluido hoy", () => {
    const week = { from: "2026-09-21", to: "2026-09-28" };
    expect(daysLeft(week, "2026-09-26")).toBe(2);
    expect(daysLeft(week, "2026-09-27")).toBe(1);
  });
});

describe("periodRangeLabel", () => {
  it("muestra el rango de días, incluido el último", () => {
    expect(periodRangeLabel({ from: "2026-09-21", to: "2026-09-28" }, "es")).toMatch(/21.*27/);
  });

  it("sigue el idioma de la página", () => {
    expect(periodRangeLabel({ from: "2026-09-01", to: "2026-10-01" }, "en")).toMatch(/Sep/);
  });
});
