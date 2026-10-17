import { NextResponse } from "next/server";
import { serializeCookieConsent } from "@/features/legal/lib/serialize";
import { syncCookieConsentSchema } from "@/features/legal/schemas/cookie-consent-api.schema";
import { legalUseCases } from "@/features/legal/server/infrastructure/legal.container";
import { getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, syncCookieConsentSchema);
    if ("error" in parsed) return parsed.error;

    const latest = await legalUseCases.syncCookieConsent.execute(userId, parsed.data);
    return NextResponse.json(latest && serializeCookieConsent(latest));
  } catch (error) {
    return internalError(req, error, "Error syncing cookie consent");
  }
}
