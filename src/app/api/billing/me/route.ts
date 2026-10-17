import { NextResponse } from "next/server";
import { billingUseCases } from "@/features/billing/server/infrastructure/billing.container";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();
    return NextResponse.json(await billingUseCases.getSummary.execute(userId));
  } catch (error) {
    return internalError(req, error, "Error fetching billing");
  }
}
