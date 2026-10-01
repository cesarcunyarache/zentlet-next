import { describe, expect, it } from "vitest";
import type { TBudget } from "../../types";
import { BUDGET_PERIODS } from "../period";
import { currentLimit, draftFrom, draftStatus, toggledKind } from "../draft";

const today = "2026-09-26";

const food: TBudget = {
  id: "b-food",
  categoryId: "food",
  kind: "recurring",
  ...BUDGET_PERIODS.weekly,
  startDate: "2026-08-03",
  limits: [
    { effectiveFrom: "2026-08-03", amount: 50 },
    { effectiveFrom: "2026-09-21", amount: 80 },
  ],
};
const expiredOnce: TBudget = {
  ...food,
  id: "b-once",
  kind: "once",
  ...BUDGET_PERIODS.monthly,
  startDate: "2026-08-01",
  limits: [{ effectiveFrom: "2026-08-01", amount: 300 }],
};

describe("currentLimit", () => {
  it("sin presupuesto no hay tope", () => {
    expect(currentLimit(undefined, today)).toBeNull();
  });

  it("usa el tope vigente en el periodo actual", () => {
    expect(currentLimit(food, today)).toBe(80);
  });

  it("uno de una sola vez ya vencido no tiene tope actual", () => {
    expect(currentLimit(expiredOnce, today)).toBeNull();
  });
});

describe("draftFrom", () => {
  it("sin presupuesto: mensual, recurrente y sin monto", () => {
    expect(draftFrom(undefined, today)).toEqual({ period: "monthly", kind: "recurring", rawAmount: "" });
  });

  it("con presupuesto vigente: sus opciones y su tope actual", () => {
    expect(draftFrom(food, today)).toEqual({ period: "weekly", kind: "recurring", rawAmount: "80" });
  });

  it("vencido: conserva sus opciones pero sin monto", () => {
    expect(draftFrom(expiredOnce, today)).toEqual({ period: "monthly", kind: "once", rawAmount: "" });
  });

  it("un periodo no admitido vuelve al mensual", () => {
    expect(draftFrom({ ...food, periodCount: 2 }, today).period).toBe("monthly");
  });
});

describe("draftStatus", () => {
  it("sin presupuesto se puede guardar cualquier monto positivo", () => {
    expect(draftStatus({ period: "monthly", kind: "recurring", rawAmount: "12.345" }, undefined, today)).toEqual({
      amount: 12.35,
      canSave: true,
    });
  });

  it("sin monto no se puede guardar", () => {
    expect(draftStatus({ period: "monthly", kind: "recurring", rawAmount: "" }, undefined, today)).toEqual({
      amount: 0,
      canSave: false,
    });
  });

  it("el mismo tope sin otros cambios no se guarda", () => {
    expect(draftStatus({ period: "weekly", kind: "recurring", rawAmount: "80" }, food, today).canSave).toBe(false);
  });

  it("otro tope sí se guarda", () => {
    expect(draftStatus({ period: "weekly", kind: "recurring", rawAmount: "90" }, food, today).canSave).toBe(true);
  });

  it("cambiar el periodo o la recurrencia con el mismo tope sí se guarda", () => {
    expect(draftStatus({ period: "monthly", kind: "recurring", rawAmount: "80" }, food, today).canSave).toBe(true);
    expect(draftStatus({ period: "weekly", kind: "once", rawAmount: "80" }, food, today).canSave).toBe(true);
  });

  it("uno vencido se puede rehacer con las mismas opciones", () => {
    expect(draftStatus({ period: "monthly", kind: "once", rawAmount: "300" }, expiredOnce, today).canSave).toBe(true);
  });
});

describe("toggledKind", () => {
  it("alterna entre recurrente y una sola vez", () => {
    expect(toggledKind("recurring")).toBe("once");
    expect(toggledKind("once")).toBe("recurring");
  });
});
