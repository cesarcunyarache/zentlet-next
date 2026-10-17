import { RecordCookieConsentUseCase } from "../application/use-cases/record-cookie-consent.use-case";
import { SyncCookieConsentUseCase } from "../application/use-cases/sync-cookie-consent.use-case";
import { PrismaCookieConsentRepository } from "./persistence/prisma/prisma-cookie-consent.repository";

const repository = new PrismaCookieConsentRepository();

export const cookieConsentUseCases = {
  record: new RecordCookieConsentUseCase(repository),
  sync: new SyncCookieConsentUseCase(repository),
};
