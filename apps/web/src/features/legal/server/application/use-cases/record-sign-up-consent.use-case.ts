import type { SignUpRollback } from "../../domain/ports/legal.ports";
import type { RecordLegalConsentUseCase } from "./record-legal-consent.use-case";

export class RecordSignUpConsentUseCase {
  constructor(
    private readonly recordLegalConsent: RecordLegalConsentUseCase,
    private readonly signUpRollback: SignUpRollback,
  ) {}

  async execute(userId: string) {
    try {
      await this.recordLegalConsent.execute(userId);
    } catch (error) {
      await this.signUpRollback.undo(userId).catch(() => {});
      throw error;
    }
  }
}
