import type { LegalDocumentId } from "../../../config";

export interface LegalConsent {
  userId: string;
  document: LegalDocumentId;
  version: string;
}
