import { NextResponse } from "next/server";
import { notificationUseCases } from "@/features/notification/server/infrastructure/notification.container";
import { hasBearerSecret, internalError, unauthorized } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return unauthorized();

  try {
    const result = await notificationUseCases.deliverPending.execute();
    logger.info(result, "cron.notifications");
    return NextResponse.json(result);
  } catch (error) {
    return internalError(req, error, "Error delivering notifications");
  }
}
