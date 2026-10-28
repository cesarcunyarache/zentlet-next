import { describe, expect, it } from "vitest";
import { BAR_MIN, CHART_HEIGHT, IDLE_HEIGHT, barHeight, budgetBarHeights } from "../chart";

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

  it("un tope pequeño no baja del mínimo que deja leer el texto", () => {
    expect(budgetBarHeights(10, 20, 1000)).toEqual({ track: BAR_MIN, fill: BAR_MIN / 2 });
  });

  it("al superar el tope el relleno sobresale en la escala del gráfico", () => {
    expect(budgetBarHeights(1000, 500, 1000)).toEqual({ track: CHART_HEIGHT / 2, fill: CHART_HEIGHT });
  });

  it("superado por poco, el relleno nunca queda por debajo del contorno", () => {
    const { track, fill } = budgetBarHeights(21, 20, 1000);
    expect(fill).toBe(track);
  });
});
