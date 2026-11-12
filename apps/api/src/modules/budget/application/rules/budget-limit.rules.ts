import type { BudgetLimit } from '../../domain/budget-limit/budget-limit.js';

/** The most recently effective limit, regardless of whether its period has started yet — used to validate new alert thresholds against "the limit as currently set", not "the limit active today". */
export function currentLimitOf(limits: BudgetLimit[]): BudgetLimit | null {
  return limits.reduce<BudgetLimit | null>(
    (latest, limit) => (!latest || limit.effectiveFrom > latest.effectiveFrom ? limit : latest),
    null,
  );
}
