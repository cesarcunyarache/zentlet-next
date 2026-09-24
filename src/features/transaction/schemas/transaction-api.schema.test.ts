import { describe, expect, it } from "vitest";
import { createTransactionSchema, transactionListQuerySchema } from "./transaction-api.schema";

const valid = {
  id: "7d3f1c2a-5b6e-4a8f-9c0d-1e2f3a4b5c6d",
  description: "Farmacia",
  amount: 25.5,
  type: "expense",
  categoryId: "health",
  transactionDate: "2026-09-20",
};

const dateIsValid = (transactionDate: string) =>
  createTransactionSchema.safeParse({ ...valid, transactionDate }).success;

describe("fecha del movimiento", () => {
  it("acepta fechas reales, incluido el 29 de febrero de un bisiesto", () => {
    expect(dateIsValid("2026-09-20")).toBe(true);
    expect(dateIsValid("2028-02-29")).toBe(true);
  });

  it("rechaza fechas con formato correcto que no existen (antes daban 500)", () => {
    for (const date of ["2026-13-45", "2026-02-30", "2026-02-29", "2026-00-10", "2026-04-31"]) {
      expect(dateIsValid(date)).toBe(false);
    }
  });

  it("rechaza formatos y años fuera de rango", () => {
    for (const date of ["20-09-2026", "2026-9-20", "0001-01-01", "9999-12-31", ""]) {
      expect(dateIsValid(date)).toBe(false);
    }
  });

  it("también en los filtros del listado", () => {
    expect(transactionListQuerySchema.safeParse({ from: "2026-02-30" }).success).toBe(false);
    expect(transactionListQuerySchema.safeParse({ from: "2026-02-01" }).success).toBe(true);
  });
});
