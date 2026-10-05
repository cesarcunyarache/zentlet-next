import { NextResponse } from "next/server";
import { handleGmailPush } from "@/features/inbox/server/gmail";
import { errorResponse, internalError } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

export async function POST(req: Request) {
  try {
    const outcome = await handleGmailPush(req);
    if (outcome === "unauthorized") return errorResponse("Unauthorized", 401);
    logger.info({ outcome }, "inbox.gmail_push");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error processing Gmail notification");
  }
}
