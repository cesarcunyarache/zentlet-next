import { describe, expect, it } from "vitest";
import { dueDatesThrough, nextOccurrenceAfter, occurrenceDate } from "../schedule";

describe("occurrenceDate", () => {
  it("steps by the frequency from the anchor", () => {
    expect(occurrenceDate("2026-01-05", "WEEKLY", 2)).toBe("2026-01-19");
    expect(occurrenceDate("2026-01-05", "MONTHLY", 1)).toBe("2026-02-05");
    expect(occurrenceDate("2026-01-05", "QUARTERLY", 1)).toBe("2026-04-05");
    expect(occurrenceDate("2026-01-05", "SEMIANNUAL", 1)).toBe("2026-07-05");
    expect(occurrenceDate("2026-01-05", "ANNUAL", 1)).toBe("2027-01-05");
  });

  it("clamps to the last day of short months and recovers the anchor day afterwards", () => {
    expect(occurrenceDate("2026-01-31", "MONTHLY", 1)).toBe("2026-02-28");
    expect(occurrenceDate("2026-01-31", "MONTHLY", 2)).toBe("2026-03-31");
    expect(occurrenceDate("2028-01-31", "MONTHLY", 1)).toBe("2028-02-29");
    expect(occurrenceDate("2024-02-29", "ANNUAL", 1)).toBe("2025-02-28");
  });
});

describe("nextOccurrenceAfter", () => {
  it("returns the first occurrence strictly after the given date", () => {
    expect(nextOccurrenceAfter("2026-01-05", "MONTHLY", "2026-01-05")).toBe("2026-02-05");
    expect(nextOccurrenceAfter("2026-01-05", "MONTHLY", "2026-03-04")).toBe("2026-03-05");
    expect(nextOccurrenceAfter("2026-01-05", "MONTHLY", "2026-03-05")).toBe("2026-04-05");
    expect(nextOccurrenceAfter("2026-01-05", "WEEKLY", "2026-10-06")).toBe("2026-10-12");
  });

  it("never returns the anchor itself", () => {
    expect(nextOccurrenceAfter("2026-12-01", "QUARTERLY", "2026-10-06")).toBe("2027-03-01");
  });
});

describe("dueDatesThrough", () => {
  const schedule = { anchorDate: "2026-07-31", frequency: "MONTHLY" as const, nextDueDate: "2026-08-31" };

  it("lists every missed occurrence up to today and the following due date", () => {
    expect(dueDatesThrough(schedule, "2026-10-06", 10)).toEqual({
      dates: ["2026-08-31", "2026-09-30"],
      nextDueDate: "2026-10-31",
    });
  });

  it("returns nothing before the due date", () => {
    expect(dueDatesThrough(schedule, "2026-08-30", 10)).toEqual({ dates: [], nextDueDate: "2026-08-31" });
  });

  it("stops at the limit and leaves the rest for the next run", () => {
    expect(dueDatesThrough(schedule, "2026-10-06", 1)).toEqual({ dates: ["2026-08-31"], nextDueDate: "2026-09-30" });
  });
});
