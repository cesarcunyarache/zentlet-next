// Flat 7-day expiry, matching apps/web's `expiresIn`. apps/web additionally
// slides the expiry forward on daily use; this module intentionally omits
// that renewal and always issues a fixed 7-day session.
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionExpiryFrom(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_TTL_MS);
}
