import type { TCookieConsent } from "../types";

type CookieConsentRecord = Omit<TCookieConsent, "createdAt"> & { createdAt: Date };

export function serializeCookieConsent(consent: CookieConsentRecord): TCookieConsent {
  return {
    granted: consent.granted,
    policyVersion: consent.policyVersion,
    createdAt: consent.createdAt.toISOString(),
  };
}
