import { APIService } from "@/core/services/api.service";
import type { RecordCookieConsentPayload } from "../schemas/cookie-consent-api.schema";
import type { TCookieConsent } from "../types";

export class CookieConsentService extends APIService {
  async record(data: RecordCookieConsentPayload): Promise<void> {
    await this.post("/api/cookie-consent", data);
  }

  async sync(visitorId: string): Promise<TCookieConsent | null> {
    const response = await this.post<TCookieConsent | null>("/api/cookie-consent/sync", { visitorId });
    return response.data;
  }
}

export const cookieConsentService = new CookieConsentService();
