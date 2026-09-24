import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, toSummary } from "./feed-query";
import { serializeTransaction } from "./serialize";

describe("cursor del feed", () => {
  const row = {
    id: "0f7c2a3e-1111-4222-8333-944445555666",
    transactionDate: new Date("2026-09-10T00:00:00.000Z"),
    createdAt: new Date("2026-09-10T15:30:12.345Z"),
  };

  it("ida y vuelta conserva fecha, alta e id", () => {
    expect(decodeCursor(encodeCursor(row))).toEqual({
      date: "2026-09-10",
      createdAt: "2026-09-10T15:30:12.345Z",
      id: row.id,
    });
  });

  it("un cursor manipulado o corrupto es null, no una excepción", () => {
    expect(decodeCursor("no-es-base64-json")).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ date: "ayer", createdAt: "x", id: "1" })).toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ date: "2026-09-10" })).toString("base64url"))).toBeNull();
  });
});

describe("toSummary", () => {
  const decimal = (value: string) => ({ toString: () => value });

  it("agrega los grupos de la base de datos por tipo y categoría", () => {
    const summary = toSummary([
      { categoryId: "food", type: "expense", _sum: { amount: decimal("25.50") }, _count: { _all: 2 } },
      { categoryId: "food", type: "income", _sum: { amount: decimal("10") }, _count: { _all: 1 } },
      { categoryId: "salary", type: "income", _sum: { amount: decimal("3000") }, _count: { _all: 1 } },
    ]);

    expect(summary).toEqual({
      count: 4,
      expenseTotal: 25.5,
      incomeTotal: 3010,
      byCategory: { food: { expense: 25.5, income: 10 }, salary: { expense: 0, income: 3000 } },
    });
  });

  it("sin movimientos da un resumen en cero", () => {
    expect(toSummary([])).toEqual({ count: 0, expenseTotal: 0, incomeTotal: 0, byCategory: {} });
  });

  it("una suma nula cuenta como cero", () => {
    const summary = toSummary([{ categoryId: "x", type: "expense", _sum: { amount: null }, _count: { _all: 1 } }]);
    expect(summary.expenseTotal).toBe(0);
    expect(summary.count).toBe(1);
  });
});

describe("serializeTransaction", () => {
  it("convierte Decimal a número y la fecha a YYYY-MM-DD", () => {
    expect(
      serializeTransaction({
        id: "t1",
        description: null,
        amount: { toString: () => "12.50" },
        type: "expense",
        categoryId: "c1",
        transactionDate: new Date("2026-09-10T00:00:00.000Z"),
        reference: null,
      }),
    ).toEqual({
      id: "t1",
      description: "",
      amount: 12.5,
      type: "expense",
      categoryId: "c1",
      transactionDate: "2026-09-10",
      reference: null,
    });
  });
});
