import { RecordCookieConsentUseCase } from "../application/use-cases/record-cookie-consent.use-case";
import { RecordLegalConsentUseCase } from "../application/use-cases/record-legal-consent.use-case";
import { RecordSignUpConsentUseCase } from "../application/use-cases/record-sign-up-consent.use-case";
import { SyncCookieConsentUseCase } from "../application/use-cases/sync-cookie-consent.use-case";
import { signUpRollback } from "./legal.adapters";
import { PrismaCookieConsentRepository } from "./persistence/prisma/prisma-cookie-consent.repository";
import { PrismaLegalConsentRepository } from "./persistence/prisma/prisma-legal-consent.repository";

const cookieConsents = new PrismaCookieConsentRepository();
const legalConsents = new PrismaLegalConsentRepository();
const recordLegalConsent = new RecordLegalConsentUseCase(legalConsents);

export const legalUseCases = {
  recordCookieConsent: new RecordCookieConsentUseCase(cookieConsents),
  syncCookieConsent: new SyncCookieConsentUseCase(cookieConsents),
  recordLegalConsent,
  recordSignUpConsent: new RecordSignUpConsentUseCase(recordLegalConsent, signUpRollback),
};
