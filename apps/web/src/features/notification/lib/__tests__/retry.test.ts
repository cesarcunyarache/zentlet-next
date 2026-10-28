import { describe, expect, it } from "vitest";
import { hasAttemptsLeft, MAX_ATTEMPTS, nextAttemptAt } from "../retry";

const now = new Date("2026-09-30T12:00:00.000Z");

describe("retry", () => {
  it("doubles the wait after each failed attempt", () => {
    expect(nextAttemptAt(1, now)).toEqual(new Date("2026-09-30T12:05:00.000Z"));
    expect(nextAttemptAt(3, now)).toEqual(new Date("2026-09-30T12:20:00.000Z"));
  });

  it("stops after the last attempt", () => {
    expect(hasAttemptsLeft(MAX_ATTEMPTS - 1)).toBe(true);
    expect(hasAttemptsLeft(MAX_ATTEMPTS)).toBe(false);
  });
});
