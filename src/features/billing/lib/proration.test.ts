import { describe, expect, it } from "vitest";
import { periodEnd, refundableAmount, refundedStatus, unusedAmount } from "./proration";

const START = new Date("2026-10-01T00:00:00Z");

describe("periodEnd", () => {
  it("suma un mes o un año", () => {
    expect(periodEnd(START, "month")).toEqual(new Date("2026-11-01T00:00:00Z"));
    expect(periodEnd(START, "year")).toEqual(new Date("2027-10-01T00:00:00Z"));
  });
});

describe("unusedAmount", () => {
  const end = new Date("2026-10-11T00:00:00Z");

  it("devuelve la parte proporcional de los días sin usar", () => {
    expect(
      unusedAmount({
        amount: 1000,
        start: START,
        end,
        now: new Date("2026-10-04T00:00:00Z"),
      }),
    ).toBe(700);
  });

  it("antes de empezar devuelve todo y después de terminar nada", () => {
    expect(
      unusedAmount({
        amount: 1000,
        start: START,
        end,
        now: new Date("2026-09-30T00:00:00Z"),
      }),
    ).toBe(1000);
    expect(unusedAmount({ amount: 1000, start: START, end, now: end })).toBe(0);
  });

  it("redondea a favor del comercio (céntimo hacia abajo)", () => {
    expect(
      unusedAmount({
        amount: 1490,
        start: START,
        end: new Date("2026-10-04T00:00:00Z"),
        now: new Date("2026-10-02T00:00:00Z"),
      }),
    ).toBe(993);
  });
});

describe("refundableAmount", () => {
  const payment = { amount: 1490, refundedAmount: 0, paidAt: START };

  it("full devuelve lo que queda por reembolsar", () => {
    expect(refundableAmount({ ...payment, refundedAmount: 490 }, "full", "month", START)).toBe(1000);
  });

  it("prorated nunca supera lo que queda por reembolsar", () => {
    expect(refundableAmount({ ...payment, refundedAmount: 1400 }, "prorated", "month", START)).toBe(90);
  });

  it("prorated a mitad de mes devuelve la mitad aproximada", () => {
    const amount = refundableAmount(payment, "prorated", "month", new Date("2026-10-16T12:00:00Z"));
    expect(amount).toBeGreaterThan(700);
    expect(amount).toBeLessThan(760);
  });
});

describe("refundedStatus", () => {
  it("distingue reembolso total y parcial", () => {
    expect(refundedStatus(1490, 1490)).toBe("refunded");
    expect(refundedStatus(1490, 500)).toBe("partially_refunded");
  });
});
