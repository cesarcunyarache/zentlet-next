import { describe, expect, it } from "vitest";
import { headlineFor } from "../headline";

const labels = { category: "Categoría", expenses: "Gastos", income: "Ingresos", total: "Balance" };
const base = { categoryId: null, categoryName: undefined, categoryValue: 0, kind: null, expenseTotal: 300, incomeTotal: 1000, labels };

describe("headlineFor", () => {
  it("sin filtros muestra el balance del periodo", () => {
    expect(headlineFor(base)).toEqual({ value: 700, label: "Balance", tone: "income" });
  });

  it("un balance negativo se muestra en tono neutro, no como gasto", () => {
    expect(headlineFor({ ...base, expenseTotal: 1200 })).toEqual({ value: -200, label: "Balance", tone: "neutral" });
  });

  it("filtrando por tipo muestra sólo los gastos o sólo los ingresos", () => {
    expect(headlineFor({ ...base, kind: "expense" })).toEqual({ value: -300, label: "Gastos", tone: "expense" });
    expect(headlineFor({ ...base, kind: "income" })).toEqual({ value: 1000, label: "Ingresos", tone: "income" });
  });

  it("con una categoría elegida manda la categoría, aunque haya filtro de tipo", () => {
    const withCategory = { ...base, kind: "income" as const, categoryId: "food", categoryName: "Comida" };

    expect(headlineFor({ ...withCategory, categoryValue: -80 })).toEqual({ value: -80, label: "Comida", tone: "expense" });
    expect(headlineFor({ ...withCategory, categoryValue: 50 })).toMatchObject({ tone: "income" });
  });

  it("si la categoría ya no existe usa la etiqueta genérica", () => {
    expect(headlineFor({ ...base, categoryId: "gone", categoryValue: 0 })).toEqual({
      value: 0,
      label: "Categoría",
      tone: "expense",
    });
  });
});
