import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dayLabel, dayShift, fullDate, parseISODate, toISODate, today } from "./dates";

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
