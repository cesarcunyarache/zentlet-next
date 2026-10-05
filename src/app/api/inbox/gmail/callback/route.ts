import { NextResponse, type NextRequest } from "next/server";
import { completeGmailConnect, GMAIL_STATE_COOKIE, isSameState } from "@/features/inbox/server/gmail";
import { siteConfig } from "@/lib/site";
import { getSessionUserId } from "@/lib/api/route-helpers";
import { reportError } from "@/lib/observability/server";

function finish(req: NextRequest, outcome: string) {
  const response = NextResponse.redirect(new URL(`${siteConfig.routes.app}?gmail=${outcome}`, req.url));
  response.cookies.delete({ name: GMAIL_STATE_COOKIE, path: "/api/inbox/gmail" });
  return response;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  if (!isSameState(req.cookies.get(GMAIL_STATE_COOKIE)?.value, params.get("state"))) return finish(req, "error");
  if (!code) return finish(req, params.get("error") === "access_denied" ? "cancelled" : "error");

  const userId = await getSessionUserId(req);
  if (!userId) return finish(req, "error");

  try {
    return finish(req, await completeGmailConnect(userId, code));
  } catch (error) {
    reportError(error, "Error completing Gmail connection", { userId });
    return finish(req, "error");
  }
}
