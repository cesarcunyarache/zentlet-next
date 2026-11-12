import { describe, expect, it } from 'vitest';
import { currentLimitOf } from './budget-limit.rules.js';

describe('currentLimitOf', () => {
  it('returns the limit with the latest effectiveFrom, regardless of array order', () => {
    const older = { budgetId: 'b1', effectiveFrom: new Date('2026-07-01'), amount: 600 };
    const newer = { budgetId: 'b1', effectiveFrom: new Date('2026-09-01'), amount: 800 };

    expect(currentLimitOf([older, newer])).toEqual(newer);
    expect(currentLimitOf([newer, older])).toEqual(newer);
  });

  it('is null with no limits', () => {
    expect(currentLimitOf([])).toBeNull();
  });
});
