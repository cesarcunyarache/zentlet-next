import { describe, expect, it } from 'vitest';
import { alertThreshold, crossedAlert, isAlertBelowLimit } from './alert.rules.js';

const percent80 = { id: 'a80', kind: 'percent' as const, value: 80 };
const percent50 = { id: 'a50', kind: 'percent' as const, value: 50 };
const amount700 = { id: 'a700', kind: 'amount' as const, value: 700 };

describe('alertThreshold', () => {
  it('scales a percent alert with the limit and keeps an amount alert fixed', () => {
    expect(alertThreshold(percent80, 1000)).toBe(800);
    expect(alertThreshold(percent80, 1200)).toBe(960);
    expect(alertThreshold(amount700, 1200)).toBe(700);
  });

  it('treats an amount at or above the limit as inactive', () => {
    expect(isAlertBelowLimit(amount700, 1000)).toBe(true);
    expect(isAlertBelowLimit(amount700, 700)).toBe(false);
  });
});

describe('crossedAlert', () => {
  it('stays quiet below every threshold', () => {
    expect(crossedAlert(400, 1000, [percent50, percent80])).toBeNull();
  });

  it('reports only the highest alert reached', () => {
    expect(crossedAlert(850, 1000, [percent50, percent80])).toEqual({ kind: 'alert', alertId: 'a80', threshold: 800 });
  });

  it('reports exceeded once spend passes the limit, superseding any alert', () => {
    expect(crossedAlert(1100, 1000, [percent50, percent80])).toEqual({ kind: 'exceeded' });
  });

  it('does not alert at exactly the limit with no alerts configured', () => {
    expect(crossedAlert(1000, 1000, [])).toBeNull();
  });

  it('skips amount alerts that are no longer below the limit', () => {
    expect(crossedAlert(650, 600, [amount700])).toEqual({ kind: 'exceeded' });
    expect(crossedAlert(590, 600, [amount700])).toBeNull();
  });
});
