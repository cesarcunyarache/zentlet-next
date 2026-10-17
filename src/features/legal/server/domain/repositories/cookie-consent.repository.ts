import type { CookieConsent, NewCookieConsent } from "../entities/cookie-consent.entity";

export interface CookieConsentRepository {
  insert(consent: NewCookieConsent): Promise<CookieConsent>;

  claimVisitor(visitorId: string, userId: string): Promise<void>;

  findLatestForUser(userId: string): Promise<CookieConsent | null>;
}
