import { describe, expect, it } from "vitest";
import type { TListEntry } from "../../types";
import {
  currencyOf,
  entryCategories,
  mergeCategoriesByName,
  netTotal,
  sortCategoriesBySpend,
  toTransaction,
} from "../entries";

const entry: TListEntry = {
  id: "t1",
  description: "Hotel",
  amount: 320,
  type: "expense",
  categoryId: "c1",
  transactionDate: "2026-10-03",
  authorId: "u1",
  category: { id: "c1", name: "Viajes", icon: "✈️", color: "#D6E8F7" },
};

describe("entries", () => {
  it("convierte la entrada al movimiento que pinta la lista de movimientos", () => {
    expect(toTransaction(entry)).toEqual({
      id: "t1",
      description: "Hotel",
      amount: 320,
      type: "expense",
      categoryId: "c1",
      transactionDate: "2026-10-03",
    });
  });

  it("toma las categorías de las propias entradas, aunque sean de otro usuario", () => {
    expect(entryCategories([entry]).get("c1")).toEqual(entry.category);
  });

  it("el balance es ingresos menos gastos", () => {
    expect(netTotal({ incomeTotal: 100, expenseTotal: 250 })).toBe(-150);
  });

  it("ordena las categorías de mayor a menor movimiento", () => {
    const sorted = sortCategoriesBySpend([
      { id: "a", expense: 10, income: 0 },
      { id: "b", expense: 50, income: 0 },
      { id: "c", expense: 0, income: 30 },
    ]);
    expect(sorted.map(({ id }) => id)).toEqual(["b", "c", "a"]);
  });
});

describe("currencyOf", () => {
  it("muestra el símbolo de la moneda de la lista, o el código si no la conoce", () => {
    expect(currencyOf("USD")).toBe("$");
    expect(currencyOf("GBP")).toBe("GBP");
  });
});

describe("mergeCategoriesByName", () => {
  it("junta las categorías de distintas personas que se llaman igual", () => {
    const merged = mergeCategoriesByName([
      { id: "a", name: "Viajes", icon: "✈️", expense: 320, income: 0 },
      { id: "b", name: "viajes ", icon: "✈️", expense: 85, income: 10 },
      { id: "c", name: "Viajes", icon: "🚌", expense: 5, income: 0 },
    ]);
    expect(merged).toEqual([
      { id: "a", name: "Viajes", icon: "✈️", expense: 405, income: 10 },
      { id: "c", name: "Viajes", icon: "🚌", expense: 5, income: 0 },
    ]);
  });
});
