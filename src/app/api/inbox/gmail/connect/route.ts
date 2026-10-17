import type { NextRequest } from "next/server";
import { redirectToGoogle, redirectWithResult } from "@/features/inbox/http/gmail-oauth";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { getSessionUserId, internalError } from "@/lib/api/route-helpers";

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return redirectWithResult(req, "error");

    const authorization = inboxUseCases.startGmailConnect.execute();
    if (!authorization) return redirectWithResult(req, "unavailable");
    return redirectToGoogle(authorization.url, authorization.state);
  } catch (error) {
    return internalError(req, error, "Error starting Gmail connection");
  }
}
