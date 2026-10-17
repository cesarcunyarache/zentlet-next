import { NextResponse } from "next/server";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";
import { notificationUseCases } from "@/features/notification/server/infrastructure/notification.container";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const feed = await notificationUseCases.getFeed.execute(userId);
    return NextResponse.json(feed);
  } catch (error) {
    return internalError(req, error, "Error fetching notifications");
  }
}
