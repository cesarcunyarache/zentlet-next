import { describe, expect, it } from "vitest";
import { notificationMessage } from "./message";

const data = {
  budgetId: "b1",
  categoryName: "Comida",
  currency: "PEN" as const,
  spent: 905,
  limit: 1000,
  periodFrom: "2026-09-01",
};

describe("notificationMessage", () => {
  it("points to the type keys and formats the amounts", () => {
    expect(notificationMessage({ type: "budget.alert", data })).toEqual({
      title: "types.budget.alert.title",
      body: "types.budget.alert.body",
      values: { category: "Comida", spent: "S/ 905.00", limit: "S/ 1,000.00", percent: 91 },
    });
  });
});
