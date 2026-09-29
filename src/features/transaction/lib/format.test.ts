import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TTransaction } from "../types";
import {
  cleanAmountInput,
  dayLabel,
  dayShift,
  displayAmount,
  formatMoney,
  formatNumber,
  formatShort,
  formatSigned,
  fullDate,
  parseAmount,
  parseISODate,
  periodRange,
  signedAmount,
  toISODate,
  today,
} from "./format";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 8, 30));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fechas locales", () => {
  it("today es hoy a mediodía y dayShift cuenta días hacia atrás", () => {
    expect(today()).toEqual(new Date(2026, 8, 24, 12));
    expect(toISODate(dayShift(1))).toBe("2026-09-23");
    expect(toISODate(dayShift(30))).toBe("2026-08-25");
  });

  it("toISODate y parseISODate son inversas", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(parseISODate("2026-01-05")).toEqual(new Date(2026, 0, 5, 12));
  });

  it("periodRange da [from, to) del mes actual, del anterior o sin límites", () => {
    expect(periodRange("month")).toEqual({ from: "2026-09-01", to: "2026-10-01" });
    expect(periodRange("previous")).toEqual({ from: "2026-08-01", to: "2026-09-01" });
    expect(periodRange("all")).toEqual({});
  });

  it("periodRange cruza el cambio de año", () => {
    vi.setSystemTime(new Date(2026, 0, 10, 9));
    expect(periodRange("previous")).toEqual({ from: "2025-12-01", to: "2026-01-01" });
    vi.setSystemTime(new Date(2026, 11, 10, 9));
    expect(periodRange("month")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });

  it("dayLabel: hoy, ayer, día de la semana o fecha", () => {
    expect(dayLabel("2026-09-24", "es")).toBe("Hoy");
    expect(dayLabel("2026-09-23", "es")).toBe("Ayer");
    expect(dayLabel("2026-09-21", "es")).toBe("Lunes");
    expect(dayLabel("2026-09-17", "es")).toBe("17 de septiembre");
    expect(dayLabel("2026-09-25", "es")).toBe("25 de septiembre");
    expect(dayLabel("2026-09-23", "en")).toBe("Yesterday");
    expect(dayLabel("2026-09-19", "en")).toBe("Saturday");
  });

  it("fullDate", () => {
    expect(fullDate("2026-09-21", "es")).toBe("lunes, 21 de septiembre de 2026");
  });
});

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

  it("signedAmount", () => {
    const base: TTransaction = { id: "1", description: "", amount: 5, type: "expense", categoryId: "c", transactionDate: "2026-09-01" };
    expect(signedAmount(base)).toBe(-5);
    expect(signedAmount({ ...base, type: "income" })).toBe(5);
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
