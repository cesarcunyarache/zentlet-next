import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TTransaction } from "../types";
import { describeOrFallback, periodRange, signedAmount } from "./format";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 8, 30));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("formato de movimientos", () => {
  it("periodRange da [from, to) del mes actual, del anterior o sin límites", () => {
    expect(periodRange("month")).toEqual({ from: "2026-09-01", to: "2026-10-01" });
    expect(periodRange("previous")).toEqual({ from: "2026-08-01", to: "2026-09-01" });
    expect(periodRange("all")).toEqual({});
  });


  it("periodRange cruza el cambio de año", () => {
    vi.setSystemTime(new Date(2026, 0, 10, 9));
    expect(periodRange("previous")).toEqual({ from: "2025-12-01", to: "2026-01-01" });
    vi.setSystemTime(new Date(2026, 11, 10, 9));
    expect(periodRange("month")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });


  it("signedAmount", () => {
    const base: TTransaction = { id: "1", description: "", amount: 5, type: "expense", categoryId: "c", transactionDate: "2026-09-01" };
    expect(signedAmount(base)).toBe(-5);
    expect(signedAmount({ ...base, type: "income" })).toBe(5);
  });


  it("describeOrFallback usa la descripción, luego la categoría y al final el texto por defecto", () => {
    expect(describeOrFallback("Almuerzo", "Comida", "Movimiento")).toBe("Almuerzo");
    expect(describeOrFallback("", "Comida", "Movimiento")).toBe("Comida");
    expect(describeOrFallback("", undefined, "Movimiento")).toBe("Movimiento");
  });
});
