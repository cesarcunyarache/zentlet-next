import { NextResponse } from "next/server";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { serializeInboxItem } from "@/features/inbox/lib/serialize";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const items = await inboxUseCases.listPending.execute(userId);
    return NextResponse.json(items.map(serializeInboxItem));
  } catch (error) {
    return internalError(req, error, "Error fetching inbox");
  }
}
