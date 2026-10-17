import { NextResponse } from "next/server";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { serializeInboxConnection } from "@/features/inbox/lib/serialize";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function DELETE(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    await inboxUseCases.disconnectGmail.execute(userId);
    const connection = await inboxUseCases.getConnection.execute(userId);
    return NextResponse.json(serializeInboxConnection(connection));
  } catch (error) {
    return internalError(req, error, "Error disconnecting Gmail");
  }
}
