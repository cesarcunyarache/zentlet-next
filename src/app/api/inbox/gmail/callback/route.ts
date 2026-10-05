import type { NextRequest } from "next/server";
import { readOAuthState, redirectWithResult } from "@/features/inbox/http/gmail-oauth";
import { completeGmailConnect } from "@/features/inbox/server/gmail-connection";
import { getSessionUserId } from "@/lib/api/route-helpers";
import { safeEqual } from "@/lib/crypto";
import { reportError } from "@/lib/observability/server";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (!safeEqual(readOAuthState(req), params.get("state"))) return redirectWithResult(req, "error");

  const code = params.get("code");
  if (!code) return redirectWithResult(req, params.get("error") === "access_denied" ? "cancelled" : "error");

  const userId = await getSessionUserId(req);
  if (!userId) return redirectWithResult(req, "error");

  try {
    return redirectWithResult(req, await completeGmailConnect(userId, code));
  } catch (error) {
    reportError(error, "Error completing Gmail connection", { userId });
    return redirectWithResult(req, "error");
  }
}
