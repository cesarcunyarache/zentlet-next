import { NextResponse } from "next/server";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";
import { notificationUseCases } from "@/features/notification/server/infrastructure/notification.container";
import { serializeNotification } from "@/features/notification/lib/serialize";
import type { NotificationFeed } from "@/features/notification/types";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { items, unreadCount } = await notificationUseCases.feed.execute(userId);

    const feed: NotificationFeed = { items: items.map(serializeNotification), unreadCount };
    return NextResponse.json(feed);
  } catch (error) {
    return internalError(req, error, "Error fetching notifications");
  }
}
