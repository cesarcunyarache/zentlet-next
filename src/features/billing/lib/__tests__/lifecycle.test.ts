import { describe, expect, it } from "vitest";
import { canReuseCheckout, firstChargeDate, isLive, isTrialEligible, resolveStatus } from "../lifecycle";

const NOW = new Date("2026-10-15T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe("isLive", () => {
  it("canceled es la única suscripción que no bloquea otra", () => {
    expect(isLive("pending")).toBe(true);
    expect(isLive("trialing")).toBe(true);
    expect(isLive("past_due")).toBe(true);
    expect(isLive("canceled")).toBe(false);
  });
});

describe("resolveStatus", () => {
  const input = {
    providerStatus: "active" as const,
    lastPaymentStatus: null,
    trialEndsAt: null,
    now: NOW,
  };

  it("un cobro fallido convierte active en past_due", () => {
    expect(resolveStatus({ ...input, lastPaymentStatus: "failed" })).toBe("past_due");
    expect(resolveStatus({ ...input, lastPaymentStatus: "approved" })).toBe("active");
    expect(
      resolveStatus({
        ...input,
        providerStatus: "canceled",
        lastPaymentStatus: "failed",
      }),
    ).toBe("canceled");
  });

  it("autorizada sin cobros y dentro de la prueba es trialing", () => {
    expect(resolveStatus({ ...input, trialEndsAt: days(5) })).toBe("trialing");
    expect(resolveStatus({ ...input, trialEndsAt: days(-1) })).toBe("active");
    expect(
      resolveStatus({
        ...input,
        trialEndsAt: days(5),
        lastPaymentStatus: "approved",
      }),
    ).toBe("active");
  });

  it("autorizada sin prueba es active aunque el primer cobro sea futuro", () => {
    expect(resolveStatus(input)).toBe("active");
  });
});

describe("isTrialEligible", () => {
  it("una sola prueba por usuario", () => {
    expect(isTrialEligible([])).toBe(true);
    expect(isTrialEligible([{ status: "canceled", trialEndsAt: null }])).toBe(true);
    expect(isTrialEligible([{ status: "canceled", trialEndsAt: days(-40) }])).toBe(false);
  });

  it("un checkout pendiente todavía no consume la prueba", () => {
    expect(isTrialEligible([{ status: "pending", trialEndsAt: days(15) }])).toBe(true);
  });
});

describe("firstChargeDate", () => {
  it("sin prueba ni periodo pagado cobra hoy", () => {
    expect(firstChargeDate({ now: NOW, trialDays: 0, paidUntil: null })).toEqual(NOW);
  });

  it("con prueba cobra al terminarla", () => {
    expect(firstChargeDate({ now: NOW, trialDays: 15, paidUntil: null })).toEqual(days(15));
  });

  it("volver a suscribirse con periodo pagado no cobra dos veces", () => {
    expect(firstChargeDate({ now: NOW, trialDays: 0, paidUntil: days(20) })).toEqual(days(20));
  });
});

describe("canReuseCheckout", () => {
  it("reutiliza un checkout reciente con url", () => {
    expect(canReuseCheckout({ checkoutUrl: "https://mp/checkout", createdAt: days(-0.5) }, NOW)).toBe(true);
    expect(canReuseCheckout({ checkoutUrl: "https://mp/checkout", createdAt: days(-2) }, NOW)).toBe(false);
    expect(canReuseCheckout({ checkoutUrl: null, createdAt: NOW }, NOW)).toBe(false);
  });
});
