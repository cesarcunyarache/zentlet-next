import { NextResponse } from "next/server";
import { recordCookieConsentSchema } from "@/features/legal/schemas/cookie-consent-api.schema";
import { legalUseCases } from "@/features/legal/server/infrastructure/legal.container";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionUserId, internalError, parseBody, tooManyRequests } from "@/lib/api/route-helpers";

const CONSENTS_PER_HOUR = 30;
const HOUR_SECONDS = 60 * 60;

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, recordCookieConsentSchema);
    if ("error" in parsed) return parsed.error;

    const limitKey = clientIp(req) ?? parsed.data.visitorId;
    const { allowed } = await rateLimit(`cookie-consent:${limitKey}`, CONSENTS_PER_HOUR, HOUR_SECONDS * 1000);
    if (!allowed) return tooManyRequests("Too many requests", HOUR_SECONDS);

    const userId = await getSessionUserId(req);
    const consent = await legalUseCases.recordCookieConsent.execute(userId, parsed.data, {
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ id: consent.id }, { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error recording cookie consent");
  }
}
