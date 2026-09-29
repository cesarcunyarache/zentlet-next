import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionFormValues } from "../schemas/transaction.schema";
import {
  finalizeFormValues,
  findCreatedCategory,
  firstWord,
  initialFormValues,
  initialRawAmount,
  isAutoSelectedCategory,
  normalizeSuggestionText,
  readAmountInput,
  shouldHintMissingCategory,
  transactionCreatedPayload,
  transactionUpdatedPayload,
  visibleCategoriesFor,
} from "./transaction-form";

const categories = [
  { id: "food", name: "Comida" },
  { id: "car", name: "Auto" },
];

const values: TransactionFormValues = {
  description: "  taxi  ",
  amount: 12,
  type: "expense",
  categoryId: "car",
  transactionDate: "2026-09-20",
};

describe("initialFormValues", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 9));
  });
  afterEach(() => vi.useRealTimers());

  it("abre vacío con la fecha de hoy", () => {
    expect(initialFormValues()).toEqual({
      description: "",
      amount: 0,
      type: "expense",
      categoryId: "",
      transactionDate: "2026-09-28",
    });
  });

  it("el borrador pisa los valores por defecto", () => {
    expect(initialFormValues({ amount: 5, transactionDate: "2026-09-01" })).toMatchObject({
      amount: 5,
      transactionDate: "2026-09-01",
    });
  });
});

describe("initialRawAmount", () => {
  it("sólo muestra montos no nulos", () => {
    expect(initialRawAmount()).toBe("");
    expect(initialRawAmount({ amount: 0 })).toBe("");
    expect(initialRawAmount({ amount: 12.5 })).toBe("12.5");
  });
});

describe("readAmountInput", () => {
  it("ignora los separadores de miles y sanea el valor", () => {
    expect(readAmountInput("1,234.567")).toEqual({ raw: "1234.56", value: 1234.56 });
    expect(readAmountInput("")).toEqual({ raw: "", value: 0 });
  });
});

describe("normalizeSuggestionText", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(normalizeSuggestionText("  Café ")).toBe("café");
  });
});

describe("categoría automática", () => {
  it("sólo cuenta si coincide con la elegida", () => {
    expect(isAutoSelectedCategory(null, "")).toBe(false);
    expect(isAutoSelectedCategory("", "")).toBe(false);
    expect(isAutoSelectedCategory("car", "food")).toBe(false);
    expect(isAutoSelectedCategory("car", "car")).toBe(true);
  });

  it("con categoría automática sólo se ve esa", () => {
    expect(visibleCategoriesFor(categories, "car", true)).toEqual([categories[1]]);
    expect(visibleCategoriesFor(categories, "car", false)).toBe(categories);
  });
});

describe("shouldHintMissingCategory", () => {
  it("avisa con texto suficiente, sin categoría y sin consulta en curso", () => {
    expect(shouldHintMissingCategory({ categoryId: "", description: " tax ", isThinking: false })).toBe(true);
    expect(shouldHintMissingCategory({ categoryId: "", description: "ta ", isThinking: false })).toBe(false);
    expect(shouldHintMissingCategory({ categoryId: "car", description: "taxi", isThinking: false })).toBe(false);
    expect(shouldHintMissingCategory({ categoryId: "", description: "taxi", isThinking: true })).toBe(false);
  });
});

describe("firstWord", () => {
  it("toma la primera palabra", () => {
    expect(firstWord("  cena con amigos")).toBe("cena");
    expect(firstWord("")).toBe("");
  });
});

describe("findCreatedCategory", () => {
  it("encuentra la categoría que no se conocía", () => {
    expect(findCreatedCategory(categories, new Set(["food"]))).toBe(categories[1]);
    expect(findCreatedCategory(categories, new Set(["food", "car"]))).toBeUndefined();
  });
});

describe("finalizeFormValues", () => {
  it("recorta la descripción y rellena si queda vacía", () => {
    expect(finalizeFormValues(values, categories, "Mov").description).toBe("taxi");
    expect(finalizeFormValues({ ...values, description: "   " }, categories, "Mov").description).toBe("Auto");
    expect(finalizeFormValues({ ...values, description: "", categoryId: "x" }, categories, "Mov").description).toBe(
      "Mov",
    );
  });
});

describe("payloads de analytics", () => {
  it("edición: marca qué cambió respecto del original", () => {
    expect(transactionUpdatedPayload(values, { categoryId: "car", type: "income" })).toEqual({
      category_changed: false,
      type_changed: true,
    });
  });

  it("alta: el borrador viene del dictado", () => {
    expect(transactionCreatedPayload(values, undefined, "car")).toEqual({
      source: "form",
      type: "expense",
      category_auto: true,
    });
    expect(transactionCreatedPayload(values, {}, null)).toEqual({
      source: "voice",
      type: "expense",
      category_auto: false,
    });
  });
});
