import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error marking notifications as read");
  }
}
