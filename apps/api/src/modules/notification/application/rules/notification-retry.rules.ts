import type { DeliveryOutcome } from '../../domain/notification-delivery/notification-delivery.js';

const MINUTE_MS = 60_000;
const BASE_DELAY_MS = 5 * MINUTE_MS;

export const MAX_ATTEMPTS = 5;
export const CLAIM_LEASE_MS = 10 * MINUTE_MS;

export function nextAttemptAt(attempts: number, now: Date): Date {
  return new Date(now.getTime() + BASE_DELAY_MS * 2 ** (attempts - 1));
}

export function hasAttemptsLeft(attempts: number): boolean {
  return attempts < MAX_ATTEMPTS;
}

export function resolveDeliveryOutcome(isSent: boolean, attempts: number, now: Date): DeliveryOutcome {
  if (isSent) return { status: 'sent', sentAt: now };
  if (hasAttemptsLeft(attempts)) return { nextAttemptAt: nextAttemptAt(attempts, now) };
  return { status: 'failed' };
}
