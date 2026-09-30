import { describe, expect, it } from "vitest";
import type { ReceiptExtraction } from "../../ai/schemas/receipt-ai.schema";
import { isForeignCurrency, toReceiptDraft } from "./receipt-draft";

const TODAY = "2026-09-30";
const categories = [
  { id: "transport", name: "Transporte" },
  { id: "food", name: "Comida" },
];

function extractionWith(overrides: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    isReceipt: true,
    amount: 25,
    currency: "PEN",
    date: "2026-09-29",
    summary: "Yape a Juan Pérez",
    description: "Taxi",
    categoryId: "transport",
    type: "expense",
    ...overrides,
  };
}

describe("toReceiptDraft", () => {
  it("maps a clean Yape extraction to a draft", () => {
    expect(toReceiptDraft(extractionWith(), categories, TODAY)).toEqual({
      type: "expense",
      amount: 25,
      description: "Taxi",
      categoryId: "transport",
      transactionDate: "2026-09-29",
    });
  });

  it("keeps income type for received payments", () => {
    expect(toReceiptDraft(extractionWith({ type: "income" }), categories, TODAY).type).toBe("income");
  });

  it("rounds the amount to cents", () => {
    expect(toReceiptDraft(extractionWith({ amount: 12.345 }), categories, TODAY).amount).toBe(12.35);
  });

  it.each([null, 0, -5, Number.NaN])("drops an unusable amount (%s)", (amount) => {
    expect(toReceiptDraft(extractionWith({ amount }), categories, TODAY).amount).toBeNull();
  });

  it("drops a category id the user does not have", () => {
    expect(toReceiptDraft(extractionWith({ categoryId: "invented" }), categories, TODAY).categoryId).toBeNull();
  });

  it.each([
    ["missing", null],
    ["malformed", "29/09/2026"],
    ["impossible", "2026-13-45"],
    ["in the future", "2026-10-02"],
    ["older than a year", "2024-01-01"],
  ])("falls back to today when the date is %s", (_, date) => {
    expect(toReceiptDraft(extractionWith({ date }), categories, TODAY).transactionDate).toBe(TODAY);
  });

  it("trims and truncates the description to the form limit", () => {
    const description = `  ${"x".repeat(60)}  `;
    expect(toReceiptDraft(extractionWith({ description }), categories, TODAY).description).toHaveLength(42);
  });
});

describe("isForeignCurrency", () => {
  it("flags a currency different from the user's", () => {
    expect(isForeignCurrency(extractionWith({ currency: "USD" }), "PEN")).toBe(true);
  });

  it("ignores case and a missing currency", () => {
    expect(isForeignCurrency(extractionWith({ currency: "pen" }), "PEN")).toBe(false);
    expect(isForeignCurrency(extractionWith({ currency: null }), "PEN")).toBe(false);
  });
});
