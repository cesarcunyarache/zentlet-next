import { describe, expect, it } from "vitest";
import type { TTransaction } from "../types";
import { dayTotal, groupByDay, groupStartIndexes, rowEnterDelay, transactionName } from "./transaction-list";

function tx(id: string, transactionDate: string, amount = 10, type: TTransaction["type"] = "expense"): TTransaction {
  return { id, description: id, amount, type, categoryId: "c", transactionDate };
}

describe("groupByDay", () => {
  it("agrupa por fecha conservando el orden de aparición", () => {
    const list = [tx("a", "2026-09-02"), tx("b", "2026-09-01"), tx("c", "2026-09-02")];
    expect(groupByDay(list)).toEqual([
      { date: "2026-09-02", items: [list[0], list[2]] },
      { date: "2026-09-01", items: [list[1]] },
    ]);
  });

  it("sin movimientos no hay grupos", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("dayTotal", () => {
  it("suma con signo", () => {
    expect(dayTotal([tx("a", "d", 30), tx("b", "d", 100, "income")])).toBe(70);
  });
});

describe("groupStartIndexes", () => {
  it("numera las filas de corrido entre días", () => {
    const groups = groupByDay([tx("a", "1"), tx("b", "1"), tx("c", "2"), tx("d", "3")]);
    expect(groupStartIndexes(groups)).toEqual([0, 2, 3]);
  });
});

describe("rowEnterDelay", () => {
  it("escalona sólo las primeras filas", () => {
    expect(rowEnterDelay(0)).toBe(0);
    expect(rowEnterDelay(2)).toBeCloseTo(0.06);
    expect(rowEnterDelay(8)).toBeCloseTo(0.24);
    expect(rowEnterDelay(50)).toBeCloseTo(0.24);
  });
});

describe("transactionName", () => {
  it("usa la descripción, luego la categoría y al final el nombre genérico", () => {
    const category = { id: "c", name: "Comida" };
    expect(transactionName(tx("taxi", "d"), category, "Mov")).toBe("taxi");
    expect(transactionName({ ...tx("x", "d"), description: "" }, category, "Mov")).toBe("Comida");
    expect(transactionName({ ...tx("x", "d"), description: "" }, undefined, "Mov")).toBe("Mov");
  });
});
