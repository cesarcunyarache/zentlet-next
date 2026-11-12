import type { BudgetAlertKind } from '../../domain/budget-alert/budget-alert.js';

export type AlertRule = { kind: BudgetAlertKind; value: number };

export type RankedAlert = AlertRule & { id: string };

export type CrossedAlert = { kind: 'exceeded' } | { kind: 'alert'; alertId: string; threshold: number };

const PERCENT = 100;

export const DEFAULT_ALERTS: AlertRule[] = [{ kind: 'percent', value: 80 }];

export function alertThreshold({ kind, value }: AlertRule, limit: number): number {
  return kind === 'percent' ? (limit * value) / PERCENT : value;
}

/** An `amount` alert at or above the limit (or a `percent` alert that scales past it) can never fire; it's treated as inactive rather than as an always-crossed alert. */
export function isAlertBelowLimit(alert: AlertRule, limit: number): boolean {
  return alertThreshold(alert, limit) < limit;
}

/**
 * Pure decision: which notice, if any, is due right now for this spend vs.
 * this limit and these alerts. Deliberately has no dedupe/already-sent
 * input (unlike the apps/web original's `dueBudgetNotice`): apps/api has no
 * notification-delivery store yet, so the caller may re-notify on repeated
 * calls — an accepted limitation, not something to work around with ad-hoc
 * storage. Only the single highest reached alert fires, same as the source.
 */
export function crossedAlert(spent: number, limit: number, alerts: RankedAlert[]): CrossedAlert | null {
  if (spent > limit) return { kind: 'exceeded' };

  const reached = alerts
    .filter((alert) => isAlertBelowLimit(alert, limit) && alertThreshold(alert, limit) <= spent)
    .reduce<RankedAlert | null>(
      (top, alert) => (!top || alertThreshold(alert, limit) > alertThreshold(top, limit) ? alert : top),
      null,
    );
  if (!reached) return null;
  return { kind: 'alert', alertId: reached.id, threshold: alertThreshold(reached, limit) };
}
