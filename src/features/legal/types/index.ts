import type { CookieCategory } from "../config";

export interface TCookieConsent {
  granted: CookieCategory[];
  policyVersion: string;
  createdAt: string;
}
