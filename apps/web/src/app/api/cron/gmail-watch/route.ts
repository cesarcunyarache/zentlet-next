import { NextResponse } from "next/server";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { hasBearerSecret, internalError, unauthorized } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return unauthorized();

  try {
    const result = await inboxUseCases.renewGmailWatches.execute();
    logger.info(result, "cron.gmail_watch");
    return NextResponse.json(result);
  } catch (error) {
    return internalError(req, error, "Error renewing Gmail watches");
  }
}
