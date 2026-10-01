import { describe, expect, it } from "vitest";
import { checkoutBody, toCents, toPaymentSnapshot, toSubscriptionSnapshot } from "./mapper";

const NOW = new Date("2026-10-15T12:00:00Z");
const checkout = {
  subscriptionId: "sub-1",
  reason: "Zentlet Pro",
  payerEmail: "ana@example.com",
  amount: 1490,
  currency: "PEN",
  interval: "month" as const,
  firstChargeAt: NOW,
  returnUrl: "https://zentlet.app/admin?billing=return",
};

describe("checkoutBody", () => {
  it("crea una preapproval pendiente sin plan asociado", () => {
    const body = checkoutBody(checkout, NOW);
    expect(body).toMatchObject({
      status: "pending",
      external_reference: "sub-1",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 14.9,
        currency_id: "PEN",
      },
    });
    expect(body.auto_recurring).not.toHaveProperty("start_date");
  });

  it("difiere el primer cobro cuando hay prueba o periodo pagado", () => {
    const firstChargeAt = new Date("2026-10-30T12:00:00Z");
    expect(checkoutBody({ ...checkout, firstChargeAt }, NOW).auto_recurring).toMatchObject({
      start_date: firstChargeAt.toISOString(),
    });
  });

  it("el plan anual se cobra cada 12 meses", () => {
    expect(checkoutBody({ ...checkout, interval: "year" }, NOW).auto_recurring.frequency).toBe(12);
  });
});

describe("toSubscriptionSnapshot", () => {
  it.each([
    ["pending", "pending"],
    ["authorized", "active"],
    ["paused", "past_due"],
    ["cancelled", "canceled"],
    ["finished", "canceled"],
  ])("%s → %s", (mpStatus, status) => {
    expect(toSubscriptionSnapshot({ id: "pre-1", status: mpStatus }).status).toBe(status);
  });

  it("falla ante un estado desconocido en vez de adivinar", () => {
    expect(() => toSubscriptionSnapshot({ id: "pre-1", status: "weird" })).toThrow();
  });

  it("usa next_payment_date como fin del periodo", () => {
    const snapshot = toSubscriptionSnapshot({
      id: "pre-1",
      status: "authorized",
      next_payment_date: "2026-11-15T12:00:00Z",
      external_reference: "sub-1",
    });
    expect(snapshot).toMatchObject({
      currentPeriodEnd: new Date("2026-11-15T12:00:00Z"),
      reference: "sub-1",
    });
  });
});

describe("toPaymentSnapshot", () => {
  const authorized = {
    id: 7001,
    preapproval_id: "pre-1",
    status: "processed",
    transaction_amount: 14.9,
    currency_id: "PEN",
    debit_date: "2026-10-30T12:00:00Z",
    payment: { id: 99, status: "approved" },
  };

  it("un cobro aprobado guarda importe en céntimos y fecha de pago", () => {
    expect(toPaymentSnapshot(authorized)).toEqual({
      externalId: "7001",
      subscriptionExternalId: "pre-1",
      providerPaymentId: "99",
      status: "approved",
      amount: 1490,
      currency: "PEN",
      paidAt: new Date("2026-10-30T12:00:00Z"),
    });
  });

  it("una cuota en reintentos es un cobro fallido", () => {
    expect(toPaymentSnapshot({ ...authorized, status: "recycling", payment: null }).status).toBe("failed");
  });

  it("una cuota programada queda pendiente", () => {
    expect(toPaymentSnapshot({ ...authorized, status: "scheduled", payment: null })).toMatchObject({
      status: "pending",
      paidAt: null,
    });
  });
});

describe("toCents", () => {
  it("evita errores de coma flotante", () => {
    expect(toCents(14.9)).toBe(1490);
    expect(toCents(0.29)).toBe(29);
  });
});
