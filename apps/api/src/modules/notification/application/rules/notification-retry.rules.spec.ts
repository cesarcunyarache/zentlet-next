import { describe, expect, it } from 'vitest';
import { hasAttemptsLeft, MAX_ATTEMPTS, nextAttemptAt, resolveDeliveryOutcome } from './notification-retry.rules.js';

const now = new Date('2026-09-30T12:00:00.000Z');

describe('notification retry rules', () => {
  it('doubles the wait after each failed attempt', () => {
    expect(nextAttemptAt(1, now)).toEqual(new Date('2026-09-30T12:05:00.000Z'));
    expect(nextAttemptAt(3, now)).toEqual(new Date('2026-09-30T12:20:00.000Z'));
  });

  it('stops after the last attempt', () => {
    expect(hasAttemptsLeft(MAX_ATTEMPTS - 1)).toBe(true);
    expect(hasAttemptsLeft(MAX_ATTEMPTS)).toBe(false);
  });

  it('resolves to sent when the send succeeded', () => {
    expect(resolveDeliveryOutcome(true, 1, now)).toEqual({ status: 'sent', sentAt: now });
  });

  it('resolves to a scheduled retry while attempts remain', () => {
    expect(resolveDeliveryOutcome(false, 1, now)).toEqual({ nextAttemptAt: new Date('2026-09-30T12:05:00.000Z') });
  });

  it('resolves to failed once attempts are exhausted', () => {
    expect(resolveDeliveryOutcome(false, MAX_ATTEMPTS, now)).toEqual({ status: 'failed' });
  });
});
