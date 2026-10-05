import { NextResponse } from "next/server";
import { trackServerEvent } from "@/lib/observability/server";
import { cancelUserSubscription } from "@/features/billing/server/cancel";
import { getBillingSummary } from "@/features/billing/server/subscriptions";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    if (await cancelUserSubscription(userId)) trackServerEvent(userId, "subscription_canceled", {});
    return NextResponse.json(await getBillingSummary(userId));
  } catch (error) {
    return internalError(req, error, "Error canceling subscription");
  }
}
