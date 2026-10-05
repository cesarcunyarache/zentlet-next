import { NextResponse } from "next/server";
import { disconnectGmail } from "@/features/inbox/server/gmail-connection";
import { getConnection } from "@/features/inbox/server/connection";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function DELETE(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    await disconnectGmail(userId);
    return NextResponse.json(await getConnection(userId));
  } catch (error) {
    return internalError(req, error, "Error disconnecting Gmail");
  }
}
