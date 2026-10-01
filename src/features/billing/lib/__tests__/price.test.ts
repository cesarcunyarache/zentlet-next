import { describe, expect, it } from "vitest";
import { formatPrice } from "../price";

describe("formatPrice", () => {
  it("convierte céntimos a la moneda del plan con el formato del país", () => {
    expect(formatPrice(1490, "PEN", "es-PE").replace(/\s/g, " ")).toBe("S/ 14.90");
    expect(formatPrice(1490, "PEN", "en-US")).toContain("14.90");
  });
});
