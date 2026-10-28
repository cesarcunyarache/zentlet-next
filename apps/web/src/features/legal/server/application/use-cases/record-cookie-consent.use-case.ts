import type { RecordCookieConsentInput } from "../../../schemas/cookie-consent-api.schema";
import { USER_AGENT_MAX_LENGTH } from "../../domain/entities/cookie-consent.entity";
import type { CookieConsentRepository } from "../../domain/repositories/cookie-consent.repository";

interface RequestContext {
  userAgent: string | null;
}

export class RecordCookieConsentUseCase {
  constructor(private readonly cookieConsentRepository: CookieConsentRepository) {}

  async execute(userId: string | null, input: RecordCookieConsentInput, context: RequestContext) {
    const consent = await this.cookieConsentRepository.insert({
      visitorId: input.visitorId,
      userId,
      granted: input.granted,
      policyVersion: input.policyVersion,
      source: input.source,
      userAgent: context.userAgent?.slice(0, USER_AGENT_MAX_LENGTH) || null,
    });

    if (userId) await this.cookieConsentRepository.claimVisitor(input.visitorId, userId);

    return consent;
  }
}
