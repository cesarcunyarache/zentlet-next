import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeInboxItem } from "@/features/inbox/lib/serialize";
import { getSessionUserId, internalError, unauthorized } from "@/lib/api/route-helpers";

const MAX_PENDING = 100;

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const items = await prisma.inboxTransaction.findMany({
      where: { userId, status: "pending" },
      orderBy: [{ transactionDate: "desc" }, { receivedAt: "desc" }],
      take: MAX_PENDING,
    });
    return NextResponse.json(items.map(serializeInboxItem));
  } catch (error) {
    return internalError(req, error, "Error fetching inbox");
  }
}
