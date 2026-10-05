import { NextResponse } from "next/server";
import { getBillingSummary } from "@/features/billing/server/subscriptions";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();
    return NextResponse.json(await getBillingSummary(userId));
  } catch (error) {
    return internalError(req, error, "Error fetching billing");
  }
}
