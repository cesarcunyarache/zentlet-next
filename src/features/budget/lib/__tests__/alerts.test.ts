import { describe, expect, it } from "vitest";
import { alertThreshold, dueBudgetNotice, isAlertBelowLimit } from "./alerts";
import type { BudgetAlert } from "../types";

const PREFIX = "budget:b1:2026-09-01:";
const percent80: BudgetAlert = { id: "a80", kind: "percent", value: 80 };
const percent50: BudgetAlert = { id: "a50", kind: "percent", value: 50 };
const amount700: BudgetAlert = { id: "a700", kind: "amount", value: 700 };

const state = (spent: number, overrides: Partial<Parameters<typeof dueBudgetNotice>[0]> = {}) => ({
  budgetId: "b1",
  periodFrom: "2026-09-01",
  spent,
  limit: 1000,
  alerts: [percent50, percent80],
  sentKeys: [],
  ...overrides,
});

describe("alertThreshold", () => {
  it("scales a percent alert with the limit and keeps an amount fixed", () => {
    expect(alertThreshold(percent80, 1000)).toBe(800);
    expect(alertThreshold(percent80, 1200)).toBe(960);
    expect(alertThreshold(amount700, 1200)).toBe(700);
  });

  it("treats an amount at or above the limit as inactive", () => {
    expect(isAlertBelowLimit(amount700, 1000)).toBe(true);
    expect(isAlertBelowLimit(amount700, 700)).toBe(false);
  });
});

describe("dueBudgetNotice", () => {
  it("stays quiet below every threshold", () => {
    expect(dueBudgetNotice(state(400))).toBeNull();
  });

  it("sends only the highest alert reached", () => {
    expect(dueBudgetNotice(state(850))).toEqual({ type: "budget.alert", dedupeKey: `${PREFIX}alert:a80` });
  });

  it("does not repeat an alert already sent in the period", () => {
    expect(dueBudgetNotice(state(900, { sentKeys: [`${PREFIX}alert:a80`] }))).toBeNull();
  });

  it("does not send a lower alert after a higher one", () => {
    expect(dueBudgetNotice(state(600, { sentKeys: [`${PREFIX}alert:a80`] }))).toBeNull();
  });

  it("sends a higher alert after a lower one", () => {
    expect(dueBudgetNotice(state(820, { sentKeys: [`${PREFIX}alert:a50`] }))?.dedupeKey).toBe(`${PREFIX}alert:a80`);
  });

  it("sends only exceeded when the limit is crossed", () => {
    expect(dueBudgetNotice(state(1100))).toEqual({ type: "budget.exceeded", dedupeKey: `${PREFIX}exceeded` });
  });

  it("does not alert at exactly the limit", () => {
    expect(dueBudgetNotice(state(1000, { alerts: [] }))).toBeNull();
  });

  it("sends no alerts after exceeded in the same period", () => {
    expect(dueBudgetNotice(state(900, { sentKeys: [`${PREFIX}exceeded`] }))).toBeNull();
  });

  it("skips amount alerts that are no longer below the limit", () => {
    expect(dueBudgetNotice(state(650, { limit: 600, alerts: [amount700] }))?.type).toBe("budget.exceeded");
    expect(dueBudgetNotice(state(590, { limit: 600, alerts: [amount700] }))).toBeNull();
  });
});
