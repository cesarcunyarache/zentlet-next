import { vi } from "vitest";
import type { CookieConsent, NewCookieConsent } from "../../../domain/entities/cookie-consent.entity";
import type { CookieConsentRepository } from "../../../domain/repositories/cookie-consent.repository";

export function stored(draft: NewCookieConsent): CookieConsent {
  return { ...draft, id: "consent-1", createdAt: new Date("2026-10-16T12:00:00Z") };
}

export function fakeRepository(overrides: Partial<CookieConsentRepository> = {}): CookieConsentRepository {
  return {
    insert: vi.fn(async (draft: NewCookieConsent) => stored(draft)),
    claimVisitor: vi.fn().mockResolvedValue(undefined),
    findLatestForUser: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}
