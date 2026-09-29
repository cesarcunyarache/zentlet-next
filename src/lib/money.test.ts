import { describe, expect, it } from "vitest";
import { cleanAmountInput, displayAmount, formatMoney, formatNumber, formatShort, formatSigned, parseAmount } from "./money";

describe("montos", () => {
  it("formatNumber, formatMoney y formatSigned", () => {
    expect(formatNumber(-1234.5)).toBe("1,234.50");
    expect(formatMoney(18, "S/")).toBe("S/ 18.00");
    expect(formatSigned(-18, "S/")).toBe("− S/ 18.00");
    expect(formatSigned(0, "$")).toBe("+ $ 0.00");
  });


  it.each([
    [0, "0"],
    [219.4, "219"],
    [-219.6, "220"],
    [999.4, "999"],
    [999.6, "1k"],
    [1000, "1k"],
    [4500, "4.5k"],
    [12345, "12.3k"],
    [99960, "100k"],
    [250000, "250k"],
    [999960, "1M"],
    [1_500_000, "1.5M"],
    [2_000_000_000, "2B"],
    [5e12, "5000B"],
  ])("formatShort(%d) → %s", (value, expected) => {
    expect(formatShort(value)).toBe(expected);
  });


  it.each([
    ["", ""],
    ["abc", ""],
    ["12,5", "12.5"],
    ["1.2.3", "1.23"],
    ["0.999", "0.99"],
    ["007", "7"],
    ["0", "0"],
    ["00.5", "0.5"],
    [".5", ".5"],
    ["1234567890123", "123456789"],
    ["1234567890.55", "123456789.55"],
    ["12.", "12."],
    ["S/ 1,234.5", "1.23"],
  ])("cleanAmountInput(%j) → %j", (raw, expected) => {
    expect(cleanAmountInput(raw)).toBe(expected);
  });


  it.each([
    ["", ""],
    ["1234", "1,234"],
    ["1234.5", "1,234.5"],
    ["12.", "12."],
    [".5", "0.5"],
  ])("displayAmount(%j) → %j", (raw, expected) => {
    expect(displayAmount(raw)).toBe(expected);
  });


  it.each([
    ["", 0],
    ["abc", 0],
    ["12.345", 12.35],
    ["0.1", 0.1],
    ["7", 7],
  ])("parseAmount(%j) → %d", (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });
});
