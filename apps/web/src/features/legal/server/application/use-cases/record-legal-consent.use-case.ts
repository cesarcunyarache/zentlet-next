import { LEGAL_DOCUMENTS, LEGAL_VERSION, type LegalDocumentId } from "../../../config";
import { acceptedDocumentsSchema } from "../../../schemas/legal-consent.schema";
import type { LegalConsentRepository } from "../../domain/repositories/legal-consent.repository";

export class RecordLegalConsentUseCase {
  constructor(private readonly legalConsentRepository: LegalConsentRepository) {}

  async execute(
    userId: string,
    documents: readonly LegalDocumentId[] = LEGAL_DOCUMENTS,
    version: string = LEGAL_VERSION,
  ) {
    const accepted = acceptedDocumentsSchema.parse(documents);
    const consents = accepted.map((document) => ({ userId, document, version }));
    await this.legalConsentRepository.recordAccepted(consents);
  }
}
