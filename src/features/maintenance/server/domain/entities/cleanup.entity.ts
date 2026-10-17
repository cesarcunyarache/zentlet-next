export const DAY_MS = 24 * 60 * 60 * 1000;

export const RETENTION_DAYS = {
  notifications: 90,
  resolvedInboxItems: 30,
  whatsappMessages: 7,
} as const;

export interface DeletedCounts {
  usageLimits: number;
  authRateLimits: number;
  sessions: number;
  verifications: number;
  notifications: number;
  inboxItems: number;
  whatsappMessages: number;
  whatsappLinkCodes: number;
}

export interface CleanupResult {
  deleted: DeletedCounts;
  usersWithoutConsent: number;
}
