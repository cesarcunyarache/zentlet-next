import { describe, expect, it } from "vitest";
import { can, effectivePlan, grantsAccess, PAST_DUE_GRACE_DAYS } from "./entitlements";

const NOW = new Date("2026-10-15T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const window = (status: Parameters<typeof grantsAccess>[0]["status"], overrides = {}) => ({
  status,
  trialEndsAt: null,
  currentPeriodEnd: null,
  planKey: "pro",
  ...overrides,
});

describe("grantsAccess", () => {
  it("active siempre da acceso", () => {
    expect(grantsAccess(window("active"), NOW)).toBe(true);
  });

  it("pending nunca da acceso", () => {
    expect(grantsAccess(window("pending", { currentPeriodEnd: days(30) }), NOW)).toBe(false);
  });

  it("trialing da acceso hasta el fin de la prueba", () => {
    expect(grantsAccess(window("trialing", { trialEndsAt: days(3) }), NOW)).toBe(true);
    expect(grantsAccess(window("trialing", { trialEndsAt: days(-1) }), NOW)).toBe(false);
  });

  it("past_due mantiene acceso durante la ventana de reintentos", () => {
    expect(
      grantsAccess(
        window("past_due", {
          currentPeriodEnd: days(-(PAST_DUE_GRACE_DAYS - 1)),
        }),
        NOW,
      ),
    ).toBe(true);
    expect(
      grantsAccess(
        window("past_due", {
          currentPeriodEnd: days(-(PAST_DUE_GRACE_DAYS + 1)),
        }),
        NOW,
      ),
    ).toBe(false);
  });

  it("canceled sólo conserva el acceso hasta currentPeriodEnd", () => {
    expect(grantsAccess(window("canceled", { currentPeriodEnd: days(10) }), NOW)).toBe(true);
    expect(grantsAccess(window("canceled", { trialEndsAt: days(5) }), NOW)).toBe(false);
    expect(grantsAccess(window("canceled", { currentPeriodEnd: days(-1) }), NOW)).toBe(false);
  });
});

describe("effectivePlan", () => {
  it("sin suscripciones es free", () => {
    expect(effectivePlan([], NOW)).toBe("free");
  });

  it("una pending nueva no tapa una canceled todavía vigente", () => {
    const subscriptions = [window("pending"), window("canceled", { currentPeriodEnd: days(10) })];
    expect(effectivePlan(subscriptions, NOW)).toBe("pro");
  });

  it("un planKey desconocido cae en free", () => {
    expect(effectivePlan([window("active", { planKey: "legacy" })], NOW)).toBe("free");
  });
});

describe("can", () => {
  it("free no incluye presupuestos ni exportación", () => {
    expect(can("free", "transactions")).toBe(true);
    expect(can("free", "budgets")).toBe(false);
    expect(can("free", "export")).toBe(false);
  });

  it("pro incluye todas las features", () => {
    expect(can("pro", "budgets")).toBe(true);
    expect(can("pro", "export")).toBe(true);
  });
});
