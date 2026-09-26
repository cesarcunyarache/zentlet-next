import { describe, expect, it } from "vitest";
import type { TTransaction, TransactionSummary } from "../types";
import {
  applyToSummary,
  findInFeed,
  inRange,
  insertIntoFeed,
  matchesFilters,
  patchInFeed,
  removeFromFeed,
  type FeedData,
} from "./feed-cache";

function tx(overrides: Partial<TTransaction> = {}): TTransaction {
  return {
    id: "tx",
    description: "Taxi al trabajo",
    amount: 10,
    type: "expense",
    categoryId: "transport",
    transactionDate: "2026-09-10",
    ...overrides,
  };
}

function feed(...pages: { items: TTransaction[]; nextCursor?: string | null }[]): FeedData {
  return {
    pages: pages.map(({ items, nextCursor = null }) => ({ items, nextCursor })),
    pageParams: pages.map((_, index) => (index === 0 ? null : `cursor-${index}`)),
  };
}

const ids = (data: FeedData) => data.pages.map((page) => page.items.map((item) => item.id));

const EMPTY_SUMMARY: TransactionSummary = { count: 0, expenseTotal: 0, incomeTotal: 0, byCategory: {} };

describe("inRange", () => {
  it("incluye `from` y excluye `to`", () => {
    const range = { from: "2026-09-01", to: "2026-10-01" };
    expect(inRange("2026-09-01", range)).toBe(true);
    expect(inRange("2026-09-30", range)).toBe(true);
    expect(inRange("2026-10-01", range)).toBe(false);
    expect(inRange("2026-08-31", range)).toBe(false);
  });

  it("sin límites acepta cualquier fecha", () => {
    expect(inRange("1999-01-01", {})).toBe(true);
  });
});

describe("matchesFilters", () => {
  it("aplica tipo, categoría y periodo", () => {
    const row = tx();
    expect(matchesFilters(row, { type: "expense", categoryId: "transport" })).toBe(true);
    expect(matchesFilters(row, { type: "income" })).toBe(false);
    expect(matchesFilters(row, { categoryId: "food" })).toBe(false);
    expect(matchesFilters(row, { from: "2026-10-01" })).toBe(false);
  });

  it("busca en la descripción sin distinguir mayúsculas", () => {
    expect(matchesFilters(tx(), { q: "TAXI" })).toBe(true);
    expect(matchesFilters(tx(), { q: "almuerzo" })).toBe(false);
  });
});

describe("insertIntoFeed", () => {
  it("inserta por fecha descendente y, dentro del mismo día, lo nuevo primero", () => {
    const data = feed({ items: [tx({ id: "a", transactionDate: "2026-09-12" }), tx({ id: "b", transactionDate: "2026-09-10" })] });

    expect(ids(insertIntoFeed(data, tx({ id: "new", transactionDate: "2026-09-10" })))).toEqual([["a", "new", "b"]]);
    expect(ids(insertIntoFeed(data, tx({ id: "new", transactionDate: "2026-09-20" })))).toEqual([["new", "a", "b"]]);
  });

  it("no duplica un movimiento que ya está (reintento o doble envío)", () => {
    const data = feed({ items: [tx({ id: "a" })] });
    expect(ids(insertIntoFeed(data, tx({ id: "a" })))).toEqual([["a"]]);
  });

  it("si es más antiguo que todo lo cargado y quedan páginas, no lo inserta: llegará al paginar", () => {
    const data = feed({ items: [tx({ id: "a", transactionDate: "2026-09-10" })], nextCursor: "next" });
    expect(ids(insertIntoFeed(data, tx({ id: "old", transactionDate: "2020-01-01" })))).toEqual([["a"]]);
  });

  it("si es más antiguo y no quedan páginas, va al final", () => {
    const data = feed({ items: [tx({ id: "a", transactionDate: "2026-09-10" })] });
    expect(ids(insertIntoFeed(data, tx({ id: "old", transactionDate: "2020-01-01" })))).toEqual([["a", "old"]]);
  });

  it("no muta los datos originales de la cache", () => {
    const data = feed({ items: [tx({ id: "a" })] });
    insertIntoFeed(data, tx({ id: "new", transactionDate: "2026-09-20" }));
    expect(ids(data)).toEqual([["a"]]);
  });
});

describe("removeFromFeed / patchInFeed / findInFeed", () => {
  const data = feed({ items: [tx({ id: "a" })], nextCursor: "next" }, { items: [tx({ id: "b" })] });

  it("elimina de cualquier página", () => {
    expect(ids(removeFromFeed(data, "b"))).toEqual([["a"], []]);
  });

  it("actualiza en su sitio si sigue cumpliendo el filtro", () => {
    const patched = patchInFeed(data, tx({ id: "b", amount: 99 }), {});
    expect(findInFeed(patched, "b")?.amount).toBe(99);
  });

  it("lo quita si deja de cumplir el filtro", () => {
    const patched = patchInFeed(data, tx({ id: "a", type: "income" }), { type: "expense" });
    expect(ids(patched)).toEqual([[], ["b"]]);
  });

  it("lo añade si ahora cumple el filtro", () => {
    const patched = patchInFeed(data, tx({ id: "c", categoryId: "food" }), { categoryId: "food" });
    expect(ids(patched)[0]).toContain("c");
  });

  it("lo recoloca si cambia de fecha", () => {
    const sorted = feed({ items: [tx({ id: "new", transactionDate: "2026-09-20" }), tx({ id: "old", transactionDate: "2026-09-01" })] });
    const patched = patchInFeed(sorted, tx({ id: "old", transactionDate: "2026-09-25" }), {});
    expect(ids(patched)).toEqual([["old", "new"]]);
  });

  it("findInFeed tolera cache vacía", () => {
    expect(findInFeed(undefined, "a")).toBeUndefined();
  });
});

describe("applyToSummary", () => {
  it("suma gastos e ingresos por separado y por categoría", () => {
    let summary = applyToSummary(EMPTY_SUMMARY, tx({ amount: 10 }), 1);
    summary = applyToSummary(summary, tx({ amount: 500, type: "income", categoryId: "salary" }), 1);

    expect(summary).toEqual({
      count: 2,
      expenseTotal: 10,
      incomeTotal: 500,
      byCategory: { transport: { expense: 10, income: 0 }, salary: { expense: 0, income: 500 } },
    });
  });

  it("restar lo sumado deja el resumen como estaba (rollback de un alta)", () => {
    const row = tx({ amount: 12.5 });
    const summary = applyToSummary(applyToSummary(EMPTY_SUMMARY, row, 1), row, -1);
    expect(summary.count).toBe(0);
    expect(summary.expenseTotal).toBe(0);
    expect(summary.byCategory.transport).toEqual({ expense: 0, income: 0 });
  });
});
