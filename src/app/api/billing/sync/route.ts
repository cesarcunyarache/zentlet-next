import { NextResponse } from "next/server";
import { findLiveSubscription, getBillingSummary, syncSubscription } from "@/features/billing/server/subscriptions";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const live = await findLiveSubscription(userId);
    if (live) await syncSubscription(live);
    return NextResponse.json(await getBillingSummary(userId));
  } catch (error) {
    return internalError(req, error, "Error syncing subscription");
  }
}
