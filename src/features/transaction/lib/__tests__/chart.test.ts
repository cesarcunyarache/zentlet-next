import { describe, expect, it } from "vitest";
import { BAR_MIN, BUDGET_GAP_MIN, CHART_HEIGHT, IDLE_HEIGHT, barHeight, budgetBarHeights } from "../chart";

describe("barHeight", () => {
  it("el mayor importe ocupa todo el alto y la mitad, la mitad", () => {
    expect(barHeight(-1000, 1000)).toEqual({ isIdle: false, height: CHART_HEIGHT });
    expect(barHeight(-500, 1000).height).toBe(CHART_HEIGHT / 2);
  });

  it("compara gasto e ingreso por magnitud: el signo no cambia el alto", () => {
    expect(barHeight(2000, 2000).height).toBe(barHeight(-2000, 2000).height);
  });

  it("un importe mayor nunca queda más bajo que uno menor", () => {
    const totals = [0.01, 1, 5, 12, 80, 300, 999, 1000];
    const heights = totals.map((total) => barHeight(total, 1000).height);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });

  it("un importe pequeño no baja del mínimo que deja leer el texto", () => {
    expect(barHeight(1, 1000).height).toBe(BAR_MIN);
  });

  it("sin movimientos (o con restos de coma flotante) es la píldora baja", () => {
    expect(barHeight(0, 1000)).toEqual({ isIdle: true, height: IDLE_HEIGHT });
    expect(barHeight(0.0000001, 1000)).toEqual({ isIdle: true, height: IDLE_HEIGHT });
    expect(barHeight(-0.004, 1000).isIdle).toBe(true);
  });

  it("sin máximo no divide por cero", () => {
    expect(barHeight(0, 0)).toEqual({ isIdle: true, height: IDLE_HEIGHT });
  });
});

describe("budgetBarHeights", () => {
  it("el contorno es proporcional al tope y el relleno, a lo gastado dentro de él", () => {
    expect(budgetBarHeights(500, 1000, 1000)).toEqual({ track: CHART_HEIGHT, fill: CHART_HEIGHT / 2 });
  });

  it("el contorno usa la misma escala que las demás barras", () => {
    expect(budgetBarHeights(0, 500, 1000).track).toBe(CHART_HEIGHT / 2);
  });

  it("sin gasto el relleno está vacío", () => {
    expect(budgetBarHeights(0, 1000, 1000).fill).toBe(0);
  });

  it("un gasto pequeño no baja del mínimo y el tope queda por encima del relleno", () => {
    expect(budgetBarHeights(10, 20, 1000)).toEqual({ track: BAR_MIN + BUDGET_GAP_MIN, fill: BAR_MIN });
  });

  it("el relleno usa la misma escala que una barra sin presupuesto del mismo gasto", () => {
    for (const spent of [1, 100, 109, 400, 999]) {
      expect(budgetBarHeights(spent, 1000, 1000).fill).toBe(barHeight(spent, 1000).height);
    }
  });

  it("gastar 109 con presupuesto nunca queda más bajo que gastar 100 sin él", () => {
    const withBudget = budgetBarHeights(109, 200, 1300);

    expect(withBudget.fill).toBeGreaterThanOrEqual(barHeight(100, 1300).height);
    expect(withBudget.track).toBeGreaterThan(withBudget.fill);
  });

  it("un tope mayor sube la línea del presupuesto", () => {
    const low = budgetBarHeights(109, 200, 1300).track;
    const high = budgetBarHeights(109, 900, 1300).track;

    expect(high).toBeGreaterThan(low);
  });

  it("gastado justo el tope, contorno y relleno coinciden", () => {
    const { track, fill } = budgetBarHeights(100, 100, 1000);

    expect(track).toBe(fill);
  });

  it("el contorno nunca pasa del alto del gráfico", () => {
    expect(budgetBarHeights(990, 1000, 1000).track).toBeLessThanOrEqual(CHART_HEIGHT);
  });

  it("al superar el tope el relleno sobresale en la escala del gráfico", () => {
    expect(budgetBarHeights(1000, 500, 1000)).toEqual({ track: CHART_HEIGHT / 2, fill: CHART_HEIGHT });
  });

  it("superado por poco, el relleno sobresale del contorno al menos el mínimo", () => {
    const { track, fill } = budgetBarHeights(21, 20, 1000);

    expect(fill - track).toBeGreaterThanOrEqual(BUDGET_GAP_MIN);
  });

  it("superado, el exceso se ve aunque gasto y tope estén ambos bajo el mínimo de la barra", () => {
    const { track, fill } = budgetBarHeights(100, 50, 500);

    expect(fill).toBe(barHeight(100, 500).height);
    expect(fill - track).toBeGreaterThanOrEqual(BUDGET_GAP_MIN);
    expect(track).toBeGreaterThanOrEqual(IDLE_HEIGHT);
  });

  it("superado, el contorno sigue la proporción tope/gasto cuando hay espacio", () => {
    const { track, fill } = budgetBarHeights(400, 200, 500);

    expect(track).toBe(Math.round(fill / 2));
  });

  it("un tope diminuto no hunde el contorno por debajo de la píldora baja", () => {
    expect(budgetBarHeights(1000, 1, 1000).track).toBe(IDLE_HEIGHT);
  });
});
