import { NextResponse } from "next/server";
import { deliverPending } from "@/features/notification/server/deliver";
import { errorResponse, hasBearerSecret, internalError } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return errorResponse("Unauthorized", 401);

  try {
    const result = await deliverPending();
    logger.info(result, "cron.notifications");
    return NextResponse.json(result);
  } catch (error) {
    return internalError(req, error, "Error delivering notifications");
  }
}
