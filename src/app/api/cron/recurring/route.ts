import { NextResponse } from "next/server";
import { materializeDueTransactions } from "@/features/recurring/server/materialize";
import { hasBearerSecret, internalError, unauthorized } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return unauthorized();

  try {
    const result = await materializeDueTransactions();
    logger.info(result, "cron.recurring");
    return NextResponse.json(result);
  } catch (error) {
    return internalError(req, error, "Error creating recurring transactions");
  }
}
