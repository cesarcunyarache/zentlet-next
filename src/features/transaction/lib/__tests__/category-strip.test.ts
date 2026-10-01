import { describe, expect, it } from "vitest";
import { IDLE_HEIGHT } from "./chart";
import type { CategoryTotal } from "../types";
import { barLayout, isOverBudget, stripScaleMax } from "./category-strip";

const category = { id: "c", name: "Comida" };

function item(total: number, budget: number | null = null): CategoryTotal {
  return { category, total, budget };
}

describe("stripScaleMax", () => {
  it("toma el mayor entre importes absolutos y topes", () => {
    expect(stripScaleMax([])).toBe(0);
    expect(stripScaleMax([item(-50), item(20, 80)])).toBe(80);
    expect(stripScaleMax([item(-150), item(20, 80)])).toBe(150);
  });
});

describe("barLayout", () => {
  it("sin presupuesto: barra simple sin contorno", () => {
    expect(barLayout(item(0), 100)).toEqual({ isIdle: true, height: IDLE_HEIGHT, fill: IDLE_HEIGHT, track: null });
    const layout = barLayout(item(-100), 100);
    expect(layout.isIdle).toBe(false);
    expect(layout.track).toBeNull();
    expect(layout.fill).toBe(layout.height);
  });

  it("con presupuesto: contorno y relleno, la altura es la mayor", () => {
    const within = barLayout(item(-50, 100), 100);
    expect(within.isIdle).toBe(false);
    expect(within.height).toBe(within.track);
    expect(within.fill).toBeLessThan(within.track!);

    const over = barLayout(item(-200, 100), 200);
    expect(over.height).toBe(over.fill);
    expect(over.fill).toBeGreaterThan(over.track!);
  });
});

describe("isOverBudget", () => {
  it("sólo con presupuesto superado", () => {
    expect(isOverBudget(item(-150))).toBe(false);
    expect(isOverBudget(item(-100, 100))).toBe(false);
    expect(isOverBudget(item(-101, 100))).toBe(true);
  });
});
