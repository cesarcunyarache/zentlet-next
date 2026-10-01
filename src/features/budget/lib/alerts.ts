import type { BudgetAlert } from "../types";

const PERCENT = 100;

export const MAX_ALERTS = 5;

export const DEFAULT_ALERTS: Omit<BudgetAlert, "id">[] = [{ kind: "percent", value: 80 }];

type BudgetNotice = { type: "budget.alert" | "budget.exceeded"; dedupeKey: string };

interface BudgetState {
  budgetId: string;
  periodFrom: string;
  spent: number;
  limit: number;
  alerts: BudgetAlert[];
  sentKeys: string[];
}

export function alertThreshold({ kind, value }: Omit<BudgetAlert, "id">, limit: number) {
  return kind === "percent" ? (limit * value) / PERCENT : value;
}

export const isAlertBelowLimit = (alert: Omit<BudgetAlert, "id">, limit: number) =>
  alertThreshold(alert, limit) < limit;

export const noticeKeyPrefix = (budgetId: string, periodFrom: string) => `budget:${budgetId}:${periodFrom}:`;

const exceededKey = (budgetId: string, periodFrom: string) => `${noticeKeyPrefix(budgetId, periodFrom)}exceeded`;

const alertKey = (budgetId: string, periodFrom: string, alertId: string) =>
  `${noticeKeyPrefix(budgetId, periodFrom)}alert:${alertId}`;

function highestSentThreshold({ budgetId, periodFrom, limit, alerts, sentKeys }: BudgetState) {
  const sent = alerts.filter((alert) => sentKeys.includes(alertKey(budgetId, periodFrom, alert.id)));
  return Math.max(-Infinity, ...sent.map((alert) => alertThreshold(alert, limit)));
}

function highestReachedAlert({ spent, limit, alerts }: BudgetState) {
  return alerts
    .filter((alert) => isAlertBelowLimit(alert, limit) && alertThreshold(alert, limit) <= spent)
    .reduce<BudgetAlert | null>(
      (top, alert) => (!top || alertThreshold(alert, limit) > alertThreshold(top, limit) ? alert : top),
      null,
    );
}

export function dueBudgetNotice(state: BudgetState): BudgetNotice | null {
  const { budgetId, periodFrom, spent, limit, sentKeys } = state;
  const exceeded = exceededKey(budgetId, periodFrom);
  if (sentKeys.includes(exceeded)) return null;
  if (spent > limit) return { type: "budget.exceeded", dedupeKey: exceeded };

  const reached = highestReachedAlert(state);
  if (!reached || alertThreshold(reached, limit) <= highestSentThreshold(state)) return null;
  return { type: "budget.alert", dedupeKey: alertKey(budgetId, periodFrom, reached.id) };
}
