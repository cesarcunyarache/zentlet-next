import { NextResponse } from "next/server";
import { billingUseCases } from "@/features/billing/server/infrastructure/billing.container";
import { hasBearerSecret, internalError, unauthorized } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return unauthorized();

  try {
    const result = await billingUseCases.reconcile.execute();
    logger.info(result, "cron.billing_sync");
    return NextResponse.json(result);
  } catch (error) {
    return internalError(req, error, "Error running billing sync");
  }
}
