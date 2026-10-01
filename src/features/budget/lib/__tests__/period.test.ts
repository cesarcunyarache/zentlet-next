import { describe, expect, it } from "vitest";
import type { TBudget } from "../types";
import {
  BUDGET_PERIODS,
  activePeriod,
  budgetPeriodOf,
  budgetRangeForView,
  isPeriodStart,
  limitAt,
  periodContaining,
  withLimit,
} from "./period";

const { weekly, biweekly, monthly, quarterly, yearly } = BUDGET_PERIODS;

function budget(overrides: Partial<TBudget> = {}): TBudget {
  return {
    id: "b1",
    categoryId: "food",
    kind: "recurring",
    ...monthly,
    startDate: "2026-07-01",
    limits: [
      { effectiveFrom: "2026-07-01", amount: 600 },
      { effectiveFrom: "2026-09-01", amount: 800 },
    ],
    ...overrides,
  };
}

describe("periodContaining", () => {
  it("semanal: de lunes a lunes", () => {
    expect(periodContaining(weekly, "2026-09-26")).toEqual({ from: "2026-09-21", to: "2026-09-28" });
    expect(periodContaining(weekly, "2026-09-21")).toEqual({ from: "2026-09-21", to: "2026-09-28" });
    expect(periodContaining(weekly, "2026-09-27")).toEqual({ from: "2026-09-21", to: "2026-09-28" });
  });

  it("semanal: una semana que cruza de mes o de año", () => {
    expect(periodContaining(weekly, "2027-01-01")).toEqual({ from: "2026-12-28", to: "2027-01-04" });
  });

  it("quincenal: del 1 al 15 y del 16 a fin de mes", () => {
    expect(periodContaining(biweekly, "2026-09-15")).toEqual({ from: "2026-09-01", to: "2026-09-16" });
    expect(periodContaining(biweekly, "2026-09-16")).toEqual({ from: "2026-09-16", to: "2026-10-01" });
    expect(periodContaining(biweekly, "2026-12-31")).toEqual({ from: "2026-12-16", to: "2027-01-01" });
  });

  it("mensual: el mes natural", () => {
    expect(periodContaining(monthly, "2026-02-28")).toEqual({ from: "2026-02-01", to: "2026-03-01" });
    expect(periodContaining(monthly, "2026-12-10")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });

  it("trimestral: ene-mar, abr-jun, jul-sep, oct-dic", () => {
    expect(periodContaining(quarterly, "2026-09-26")).toEqual({ from: "2026-07-01", to: "2026-10-01" });
    expect(periodContaining(quarterly, "2026-10-01")).toEqual({ from: "2026-10-01", to: "2027-01-01" });
  });

  it("anual: el año natural", () => {
    expect(periodContaining(yearly, "2026-09-26")).toEqual({ from: "2026-01-01", to: "2027-01-01" });
  });
});

describe("isPeriodStart", () => {
  it("sólo el primer día de cada periodo lo inicia", () => {
    expect(isPeriodStart(weekly, "2026-09-21")).toBe(true);
    expect(isPeriodStart(weekly, "2026-09-22")).toBe(false);
    expect(isPeriodStart(biweekly, "2026-09-16")).toBe(true);
    expect(isPeriodStart(biweekly, "2026-09-15")).toBe(false);
    expect(isPeriodStart(quarterly, "2026-07-01")).toBe(true);
    expect(isPeriodStart(quarterly, "2026-08-01")).toBe(false);
    expect(isPeriodStart(yearly, "2026-01-01")).toBe(true);
  });
});

describe("budgetPeriodOf", () => {
  it("reconoce cada opción y rechaza combinaciones que no lo son", () => {
    expect(budgetPeriodOf(quarterly)).toBe("quarterly");
    expect(budgetPeriodOf({ periodUnit: "month", periodCount: 2 })).toBeNull();
  });
});

describe("activePeriod", () => {
  it("un presupuesto recurrente vale en cualquier periodo desde su inicio", () => {
    expect(activePeriod(budget(), "2027-03-10")).toEqual({ from: "2027-03-01", to: "2027-04-01" });
  });

  it("antes de su inicio no vale", () => {
    expect(activePeriod(budget(), "2026-06-30")).toBeNull();
  });

  it("uno de una sola vez sólo vale en su periodo", () => {
    const once = budget({ kind: "once", ...weekly, startDate: "2026-09-21" });
    expect(activePeriod(once, "2026-09-27")).toEqual({ from: "2026-09-21", to: "2026-09-28" });
    expect(activePeriod(once, "2026-09-28")).toBeNull();
  });
});

describe("budgetRangeForView", () => {
  const today = "2026-09-26";
  const thisMonth = { from: "2026-09-01", to: "2026-10-01" };
  const lastMonth = { from: "2026-08-01", to: "2026-09-01" };

  it("viendo el mes actual, cada presupuesto se mide en su propio periodo actual", () => {
    expect(budgetRangeForView(budget({ ...weekly, startDate: "2026-09-21" }), thisMonth, today)).toEqual({
      from: "2026-09-21",
      to: "2026-09-28",
    });
    expect(budgetRangeForView(budget(), thisMonth, today)).toEqual(thisMonth);
  });

  it("viendo el mes pasado, sólo se muestran los mensuales, con su tope de entonces", () => {
    expect(budgetRangeForView(budget(), lastMonth, today)).toEqual(lastMonth);
    expect(budgetRangeForView(budget({ ...weekly, startDate: "2026-07-06" }), lastMonth, today)).toBeNull();
  });

  it("viendo todo el historial no hay presupuestos", () => {
    expect(budgetRangeForView(budget(), {}, today)).toBeNull();
  });

  it("uno de una sola vez que ya pasó no se muestra", () => {
    const once = budget({ kind: "once", ...weekly, startDate: "2026-09-14" });
    expect(budgetRangeForView(once, thisMonth, today)).toBeNull();
  });
});

describe("limitAt", () => {
  it("usa el tope vigente en ese periodo, no el actual", () => {
    expect(limitAt(budget(), "2026-08-01")).toBe(600);
    expect(limitAt(budget(), "2026-09-01")).toBe(800);
  });

  it("antes de crearse el presupuesto no hay tope", () => {
    expect(limitAt(budget(), "2026-06-01")).toBeNull();
  });

  it("no depende del orden en que lleguen los topes", () => {
    expect(limitAt(budget({ limits: [...budget().limits].reverse() }), "2026-10-01")).toBe(800);
  });
});

describe("withLimit", () => {
  it("reemplaza el tope del mismo periodo y conserva los anteriores", () => {
    const updated = withLimit(budget(), { effectiveFrom: "2026-09-01", amount: 900 });
    expect(updated.limits).toEqual([
      { effectiveFrom: "2026-07-01", amount: 600 },
      { effectiveFrom: "2026-09-01", amount: 900 },
    ]);
  });
});
