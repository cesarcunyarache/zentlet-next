import { describe, expect, it } from 'vitest';
import type { FlagDefinition } from './feature.js';
import { isValidRollout, resolveFeatureFlag, rolloutBucket, usageCutoff } from './resolve-feature.js';

const definition = (slug: string, enabled: boolean, rollout = 100): FlagDefinition => ({ slug, enabled, rollout });

const users = Array.from({ length: 10_000 }, (_, index) => `user-${index}`);
const share = (slug: string, rollout: number) =>
  users.filter((userId) => resolveFeatureFlag(definition(slug, true, rollout), userId, null)).length / users.length;

describe('resolveFeatureFlag', () => {
  it('disabled globally stays off for everyone, even with an override granting it', () => {
    expect(resolveFeatureFlag(definition('a', false), 'u', null)).toBe(false);
    expect(resolveFeatureFlag(definition('a', false), 'u', true)).toBe(false);
  });

  it('enabled globally, the user override wins over the rollout in both directions', () => {
    expect(resolveFeatureFlag(definition('a', true, 0), 'u', true)).toBe(true);
    expect(resolveFeatureFlag(definition('a', true, 100), 'u', false)).toBe(false);
  });

  it('0% rollout is nobody and 100% is everybody', () => {
    expect(share('a', 0)).toBe(0);
    expect(share('a', 100)).toBe(1);
  });

  it('a rollout percentage splits users roughly proportionally', () => {
    expect(share('new-home', 5)).toBeCloseTo(0.05, 1);
    expect(share('new-home', 50)).toBeCloseTo(0.5, 1);
  });

  it('raising the rollout keeps the users who already had it', () => {
    const at5 = users.filter((userId) => resolveFeatureFlag(definition('new-home', true, 5), userId, null));
    const at20 = new Set(users.filter((userId) => resolveFeatureFlag(definition('new-home', true, 20), userId, null)));
    expect(at5.every((userId) => at20.has(userId))).toBe(true);
  });

  it('each flag picks a different set of users', () => {
    const first = users.filter((userId) => resolveFeatureFlag(definition('flag-a', true, 10), userId, null));
    const second = new Set(users.filter((userId) => resolveFeatureFlag(definition('flag-b', true, 10), userId, null)));
    expect(first.filter((userId) => second.has(userId)).length / first.length).toBeLessThan(0.3);
  });
});

describe('rolloutBucket', () => {
  it('is stable for the same slug and user, and stays within 0-99', () => {
    expect(rolloutBucket('new-home', 'user-1')).toBe(rolloutBucket('new-home', 'user-1'));
    expect(users.every((userId) => rolloutBucket('x', userId) >= 0 && rolloutBucket('x', userId) < 100)).toBe(true);
  });
});

describe('isValidRollout', () => {
  it('accepts integers from 0 to 100', () => {
    expect([0, 5, 100].every(isValidRollout)).toBe(true);
    expect([-1, 101, 2.5, Number.NaN].some(isValidRollout)).toBe(false);
  });
});

describe('usageCutoff', () => {
  it('is one day before', () => {
    expect(usageCutoff(new Date('2026-09-30T12:00:00Z')).toISOString()).toBe('2026-09-29T12:00:00.000Z');
  });
});
