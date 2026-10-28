import { z } from "zod";
import type { UserCookieConsent as CookieConsentRow } from "@/generated/prisma/client";
import { COOKIE_CATEGORIES, COOKIE_CONSENT_SOURCES, type CookieCategory } from "../../../../config";
import type { CookieConsent } from "../../../domain/entities/cookie-consent.entity";

const storedSource = z.enum(COOKIE_CONSENT_SOURCES).catch("banner");

const isCookieCategory = (value: string): value is CookieCategory =>
  (COOKIE_CATEGORIES as readonly string[]).includes(value);

export function toDomain(row: CookieConsentRow): CookieConsent {
  return {
    id: row.id,
    visitorId: row.visitorId,
    userId: row.userId,
    granted: row.granted.filter(isCookieCategory),
    policyVersion: row.policyVersion,
    source: storedSource.parse(row.source),
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  };
}
