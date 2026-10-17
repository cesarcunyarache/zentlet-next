import type { CookieCategory, CookieConsentSource } from "../../../config";

export interface CookieConsent {
  id: string;
  visitorId: string;
  userId: string | null;
  granted: CookieCategory[];
  policyVersion: string;
  source: CookieConsentSource;
  userAgent: string | null;
  createdAt: Date;
}

export type NewCookieConsent = Omit<CookieConsent, "id" | "createdAt">;

export const USER_AGENT_MAX_LENGTH = 512;
