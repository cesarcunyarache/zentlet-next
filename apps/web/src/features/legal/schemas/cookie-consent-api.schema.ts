import { z } from "zod";
import { COOKIE_CATEGORIES, COOKIE_CONSENT_SOURCES } from "../config";

export const recordCookieConsentSchema = z.object({
  visitorId: z.uuid(),
  granted: z
    .array(z.enum(COOKIE_CATEGORIES))
    .max(COOKIE_CATEGORIES.length)
    .transform((categories) => [...new Set(categories)]),
  policyVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(COOKIE_CONSENT_SOURCES),
});

export const syncCookieConsentSchema = z.object({
  visitorId: z.uuid(),
});

export type RecordCookieConsentInput = z.infer<typeof recordCookieConsentSchema>;
export type RecordCookieConsentPayload = z.input<typeof recordCookieConsentSchema>;
export type SyncCookieConsentInput = z.infer<typeof syncCookieConsentSchema>;
