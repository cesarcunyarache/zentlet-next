import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id } = await params;
    const { count } = await prisma.inboxSender.deleteMany({ where: { id, userId } });
    if (!count) return errorResponse("Sender not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error removing sender");
  }
}
