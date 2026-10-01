import { describe, expect, it } from "vitest";
import type { BillingSummary } from "../../types";
import { planAction, planHint } from "../plan-hint";

const summary = (overrides: Partial<BillingSummary> = {}): BillingSummary => ({
  plan: "free",
  features: [],
  status: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  isTrialEligible: true,
  hasPendingCheckout: false,
  price: { amount: 1490, currency: "PEN", interval: "month" },
  ...overrides,
});

describe("planHint", () => {
  it("free sin suscripción", () => {
    expect(planHint(summary())).toEqual({ key: "free", date: null });
  });

  it("checkout pendiente", () => {
    expect(planHint(summary({ hasPendingCheckout: true })).key).toBe("pending");
  });

  it("prueba con su fecha de fin", () => {
    expect(planHint(summary({ plan: "pro", status: "trialing", trialEndsAt: "2026-10-30" }))).toEqual({
      key: "trial",
      date: "2026-10-30",
    });
  });

  it("cancelada con acceso hasta fin de periodo", () => {
    expect(
      planHint(
        summary({
          plan: "pro",
          status: "canceled",
          currentPeriodEnd: "2026-11-01",
        }),
      ),
    ).toEqual({ key: "canceled", date: "2026-11-01" });
  });

  it("cobro fallido", () => {
    expect(planHint(summary({ plan: "pro", status: "past_due" })).key).toBe("pastDue");
  });
});

describe("planAction", () => {
  it("free elegible ofrece la prueba; sin prueba, mejorar", () => {
    expect(planAction(summary())).toBe("startTrial");
    expect(planAction(summary({ isTrialEligible: false }))).toBe("upgrade");
  });

  it("pro activo o en prueba ofrece cancelar", () => {
    expect(planAction(summary({ plan: "pro", status: "active" }))).toBe("cancel");
    expect(planAction(summary({ plan: "pro", status: "trialing" }))).toBe("cancel");
  });

  it("pro cancelado con acceso ofrece volver a suscribirse", () => {
    expect(planAction(summary({ plan: "pro", status: "canceled", isTrialEligible: false }))).toBe("upgrade");
  });
});
