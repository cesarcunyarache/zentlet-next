import { NextResponse, type NextRequest } from "next/server";
import { hasFeature } from "@/features/billing/server/access";
import { GMAIL_STATE_COOKIE, startGmailConnect } from "@/features/inbox/server/gmail";
import { siteConfig } from "@/lib/site";
import { getSessionUserId, internalError } from "@/lib/api/route-helpers";

const STATE_MAX_AGE_SECONDS = 600;

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId || !(await hasFeature(userId, "email_import"))) {
      return NextResponse.redirect(new URL(`${siteConfig.routes.app}?gmail=error`, req.url));
    }

    const started = startGmailConnect();
    if (!started) return NextResponse.redirect(new URL(`${siteConfig.routes.app}?gmail=unavailable`, req.url));

    const response = NextResponse.redirect(started.url);
    response.cookies.set(GMAIL_STATE_COOKIE, started.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/inbox/gmail",
      maxAge: STATE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return internalError(req, error, "Error starting Gmail connection");
  }
}
