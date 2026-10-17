import { NextResponse } from "next/server";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { INBOX_ERRORS } from "@/features/inbox/server/infrastructure/http/inbox.http-errors";
import { serializeInboxConnection } from "@/features/inbox/lib/serialize";
import { errorFrom, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const connection = await inboxUseCases.getConnection.execute(userId);
    return NextResponse.json(serializeInboxConnection(connection));
  } catch (error) {
    return internalError(req, error, "Error fetching email connection");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const result = await inboxUseCases.createConnection.execute(userId);
    if ("error" in result) return errorFrom(INBOX_ERRORS, result.error);

    const connection = await inboxUseCases.getConnection.execute(userId);
    return NextResponse.json(serializeInboxConnection(connection), { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error creating email connection");
  }
}
