import { describe, expect, it } from 'vitest';
import { MAX_OCCURRENCES_PER_RUN, dueDatesThrough, nextOccurrenceAfter, occurrenceDate } from './schedule.js';

const d = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe('occurrenceDate', () => {
  it('steps by the frequency from the anchor', () => {
    expect(iso(occurrenceDate(d('2026-01-05'), 'WEEKLY', 2))).toBe('2026-01-19');
    expect(iso(occurrenceDate(d('2026-01-05'), 'MONTHLY', 1))).toBe('2026-02-05');
    expect(iso(occurrenceDate(d('2026-01-05'), 'QUARTERLY', 1))).toBe('2026-04-05');
    expect(iso(occurrenceDate(d('2026-01-05'), 'SEMIANNUAL', 1))).toBe('2026-07-05');
    expect(iso(occurrenceDate(d('2026-01-05'), 'ANNUAL', 1))).toBe('2027-01-05');
  });

  it('clamps to the last day of short months and recovers the anchor day afterwards', () => {
    // 2026 is not a leap year: Feb has 28 days.
    expect(iso(occurrenceDate(d('2026-01-31'), 'MONTHLY', 1))).toBe('2026-02-28');
    expect(iso(occurrenceDate(d('2026-01-31'), 'MONTHLY', 2))).toBe('2026-03-31');
    // 2028 is a leap year: Feb has 29 days.
    expect(iso(occurrenceDate(d('2028-01-31'), 'MONTHLY', 1))).toBe('2028-02-29');
    expect(iso(occurrenceDate(d('2028-01-31'), 'MONTHLY', 2))).toBe('2028-03-31');
    // An anchor on a leap day clamps to Feb 28 on the next (non-leap) year.
    expect(iso(occurrenceDate(d('2024-02-29'), 'ANNUAL', 1))).toBe('2025-02-28');
  });
});

describe('nextOccurrenceAfter', () => {
  it('returns the first occurrence strictly after the given date', () => {
    expect(iso(nextOccurrenceAfter(d('2026-01-05'), 'MONTHLY', d('2026-01-05')))).toBe('2026-02-05');
    expect(iso(nextOccurrenceAfter(d('2026-01-05'), 'MONTHLY', d('2026-03-04')))).toBe('2026-03-05');
    expect(iso(nextOccurrenceAfter(d('2026-01-05'), 'MONTHLY', d('2026-03-05')))).toBe('2026-04-05');
    expect(iso(nextOccurrenceAfter(d('2026-01-05'), 'WEEKLY', d('2026-10-06')))).toBe('2026-10-12');
  });

  it('never returns a date at or before "after", even when "after" precedes the anchor', () => {
    expect(iso(nextOccurrenceAfter(d('2026-12-01'), 'QUARTERLY', d('2026-10-06')))).toBe('2027-03-01');
  });

  it('never returns the given date itself', () => {
    const after = d('2026-05-05');
    const next = nextOccurrenceAfter(d('2026-01-05'), 'MONTHLY', after);
    expect(next.getTime()).toBeGreaterThan(after.getTime());
  });
});

describe('dueDatesThrough', () => {
  const schedule = { anchorDate: d('2026-07-31'), frequency: 'MONTHLY' as const, nextDueDate: d('2026-08-31') };

  it('lists every missed occurrence up to today and the following due date', () => {
    const result = dueDatesThrough(schedule, d('2026-10-06'), 10);
    expect(result.dates.map(iso)).toEqual(['2026-08-31', '2026-09-30']);
    expect(iso(result.nextDueDate)).toBe('2026-10-31');
  });

  it('returns nothing before the due date', () => {
    const result = dueDatesThrough(schedule, d('2026-08-30'), 10);
    expect(result.dates).toEqual([]);
    expect(iso(result.nextDueDate)).toBe('2026-08-31');
  });

  it('stops at the limit and leaves the rest for the next run', () => {
    const result = dueDatesThrough(schedule, d('2026-10-06'), 1);
    expect(result.dates.map(iso)).toEqual(['2026-08-31']);
    expect(iso(result.nextDueDate)).toBe('2026-09-30');
  });

  it('caps a long-overdue template at the given limit', () => {
    const veryOverdue = { anchorDate: d('2000-01-01'), frequency: 'WEEKLY' as const, nextDueDate: d('2000-01-01') };
    const result = dueDatesThrough(veryOverdue, d('2026-12-06'), MAX_OCCURRENCES_PER_RUN);
    expect(result.dates).toHaveLength(MAX_OCCURRENCES_PER_RUN);
    expect(result.nextDueDate.getTime()).toBeLessThan(d('2026-12-06').getTime());
  });
});
