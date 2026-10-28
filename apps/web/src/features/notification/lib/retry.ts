const MINUTE_MS = 60_000;
const BASE_DELAY_MS = 5 * MINUTE_MS;

export const MAX_ATTEMPTS = 5;
export const CLAIM_LEASE_MS = 10 * MINUTE_MS;

export function nextAttemptAt(attempts: number, now: Date) {
  return new Date(now.getTime() + BASE_DELAY_MS * 2 ** (attempts - 1));
}

export function hasAttemptsLeft(attempts: number) {
  return attempts < MAX_ATTEMPTS;
}
