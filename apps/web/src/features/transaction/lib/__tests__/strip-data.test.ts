import { describe, expect, it } from "vitest";
import type { CategoryTotals } from "../../types";
import { buildStripData, categoryValue } from "../strip-data";

const food = { id: "food", name: "Comida" };
const salary = { id: "salary", name: "Sueldo" };
const gifts = { id: "gifts", name: "Regalos" };

const byCategory: Record<string, CategoryTotals> = {
  food: { expense: 500, income: 0 },
  salary: { expense: 0, income: 3000 },
  gifts: { expense: 120, income: 40 },
};

const noBudgets = () => null;

describe("categoryValue", () => {
  it("sin filtro es el neto; con filtro, sólo gastos (negativo) o sólo ingresos", () => {
    expect(categoryValue(byCategory.gifts, null)).toBe(-80);
    expect(categoryValue(byCategory.gifts, "expense")).toBe(-120);
    expect(categoryValue(byCategory.gifts, "income")).toBe(40);
  });

  it("una categoría sin movimientos vale 0", () => {
    expect(categoryValue(undefined, null)).toBe(0);
  });
});

describe("buildStripData", () => {
  it("sin presupuestos, cada barra es el valor de su categoría, de mayor a menor", () => {
    const data = buildStripData({ categories: [food, gifts, salary], byCategory, kind: null, budgetFor: noBudgets });

    expect(data).toEqual([
      { category: salary, total: 3000, budget: null },
      { category: food, total: -500, budget: null },
      { category: gifts, total: -80, budget: null },
    ]);
  });

  it("con presupuesto, la barra muestra lo gastado en el periodo del presupuesto y su tope", () => {
    const data = buildStripData({
      categories: [gifts],
      byCategory,
      kind: null,
      budgetFor: (id) => (id === "gifts" ? { limit: 200, spent: 60 } : null),
    });

    expect(data).toEqual([{ category: gifts, total: -60, budget: 200 }]);
  });

  it("ordena por lo que se ve: una categoría con tope alto y poco gasto va antes que una con más gasto", () => {
    const data = buildStripData({
      categories: [food, gifts],
      byCategory,
      kind: "expense",
      budgetFor: (id) => (id === "gifts" ? { limit: 1000, spent: 120 } : null),
    });

    expect(data.map((item) => item.category.id)).toEqual(["gifts", "food"]);
  });

  it("viendo sólo ingresos no hay presupuestos", () => {
    const data = buildStripData({
      categories: [gifts],
      byCategory,
      kind: "income",
      budgetFor: () => ({ limit: 200, spent: 60 }),
    });

    expect(data).toEqual([{ category: gifts, total: 40, budget: null }]);
  });

  it("una categoría con presupuesto y sin gastos aparece vacía con su tope", () => {
    const rent = { id: "rent", name: "Alquiler" };
    const data = buildStripData({
      categories: [rent],
      byCategory,
      kind: "expense",
      budgetFor: () => ({ limit: 900, spent: 0 }),
    });

    expect(data).toEqual([{ category: rent, total: 0, budget: 900 }]);
  });
});
