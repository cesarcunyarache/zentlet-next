import { describe, expect, it } from "vitest";
import { buildDonutArcs, getBudgetStatus, getInitials, getTickerRange, splitInHalf } from "./visuals";

describe("splitInHalf", () => {
  it("deja la mitad mayor en la primera parte", () => {
    expect(splitInHalf([1, 2, 3, 4, 5])).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
    expect(splitInHalf([1, 2, 3, 4])).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(splitInHalf([])).toEqual([[], []]);
  });
});

describe("getTickerRange", () => {
  it("cuenta hacia arriba desde 0 por defecto", () => {
    expect(getTickerRange({ value: 3 })).toEqual({ value: 3, startValue: 0, direction: "up" });
  });

  it("cuenta hacia arriba desde `from` cuando es menor", () => {
    expect(getTickerRange({ value: 10, from: 4 })).toEqual({ value: 10, startValue: 4, direction: "up" });
  });

  it("invierte los extremos al contar hacia atrás", () => {
    expect(getTickerRange({ value: 0, from: 12 })).toEqual({ value: 12, startValue: 0, direction: "down" });
  });
});

describe("getBudgetStatus", () => {
  it("marca el exceso y limita la barra a 1", () => {
    const status = getBudgetStatus({ spent: 412.8, budget: 380 });
    expect(status.isOver).toBe(true);
    expect(status.rest).toBeCloseTo(32.8);
    expect(status.ratio).toBe(1);
  });

  it("calcula lo que queda y la proporción gastada", () => {
    expect(getBudgetStatus({ spent: 186, budget: 250 })).toEqual({ isOver: false, rest: 64, ratio: 0.744 });
  });

  it("no considera exceso gastar justo el tope", () => {
    expect(getBudgetStatus({ spent: 100, budget: 100 })).toEqual({ isOver: false, rest: 0, ratio: 1 });
  });
});

describe("buildDonutArcs", () => {
  it("reparte la circunferencia en proporción y encadena los desplazamientos", () => {
    const arcs = buildDonutArcs(
      [
        { name: "Casa", color: "a", total: 50 },
        { name: "Mercado", color: "b", total: 30 },
        { name: "Comida", color: "c", total: 20 },
      ],
      100,
    );
    expect(arcs).toEqual([
      { key: "Casa", color: "a", length: 50, offset: 0 },
      { key: "Mercado", color: "b", length: 30, offset: 50 },
      { key: "Comida", color: "c", length: 20, offset: 80 },
    ]);
  });

  it("devuelve una lista vacía sin categorías", () => {
    expect(buildDonutArcs([], 100)).toEqual([]);
  });
});

describe("getInitials", () => {
  it("toma la inicial de las dos primeras palabras", () => {
    expect(getInitials("Ana Torres")).toBe("AT");
    expect(getInitials("Ana María Torres")).toBe("AM");
    expect(getInitials("Ana")).toBe("A");
  });
});
