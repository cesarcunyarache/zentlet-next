import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";
import { NOTIFICATION_FIELDS, serializeNotification } from "@/features/notification/lib/serialize";
import type { NotificationFeed } from "@/features/notification/types";

const FEED_SIZE = 50;

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        select: NOTIFICATION_FIELDS,
        orderBy: { createdAt: "desc" },
        take: FEED_SIZE,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    const feed: NotificationFeed = { items: rows.map(serializeNotification), unreadCount };
    return NextResponse.json(feed);
  } catch (error) {
    return internalError(req, error, "Error fetching notifications");
  }
}
