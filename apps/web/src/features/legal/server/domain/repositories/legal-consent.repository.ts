import type { LegalConsent } from "../entities/legal-consent.entity";

export interface LegalConsentRepository {
  recordAccepted(consents: LegalConsent[]): Promise<void>;
}
