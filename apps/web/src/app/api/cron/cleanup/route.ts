import { NextResponse } from "next/server";
import { hasBearerSecret, internalError, unauthorized } from "@/lib/api/route-helpers";
import { maintenanceUseCases } from "@/features/maintenance/server/infrastructure/maintenance.container";

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return unauthorized();

  try {
    return NextResponse.json(await maintenanceUseCases.cleanup.execute());
  } catch (error) {
    return internalError(req, error, "Error running cleanup");
  }
}
