import type { SyncCookieConsentInput } from "../../../schemas/cookie-consent-api.schema";
import type { CookieConsentRepository } from "../../domain/repositories/cookie-consent.repository";

export class SyncCookieConsentUseCase {
  constructor(private readonly cookieConsentRepository: CookieConsentRepository) {}

  async execute(userId: string, input: SyncCookieConsentInput) {
    await this.cookieConsentRepository.claimVisitor(input.visitorId, userId);
    return this.cookieConsentRepository.findLatestForUser(userId);
  }
}
