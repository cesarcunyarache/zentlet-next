import type { NextRequest } from "next/server";
import { redirectToGoogle, redirectWithResult } from "@/features/inbox/http/gmail-oauth";
import { startGmailConnect } from "@/features/inbox/server/gmail-connection";
import { getSessionUserId, internalError } from "@/lib/api/route-helpers";

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return redirectWithResult(req, "error");

    const started = startGmailConnect();
    if (!started) return redirectWithResult(req, "unavailable");
    return redirectToGoogle(started.url, started.state);
  } catch (error) {
    return internalError(req, error, "Error starting Gmail connection");
  }
}
