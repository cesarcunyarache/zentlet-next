import { NextResponse } from "next/server";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";
import { notificationUseCases } from "@/features/notification/server/infrastructure/notification.container";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    await notificationUseCases.markRead.execute(userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error marking notifications as read");
  }
}
