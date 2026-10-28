import { NextResponse } from "next/server";
import { trackServerEvent } from "@/lib/observability/server";
import { billingUseCases } from "@/features/billing/server/infrastructure/billing.container";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const canceled = await billingUseCases.cancelUserSubscription.execute(userId);
    if (canceled) trackServerEvent(userId, "subscription_canceled", {});

    return NextResponse.json(await billingUseCases.getSummary.execute(userId));
  } catch (error) {
    return internalError(req, error, "Error canceling subscription");
  }
}
