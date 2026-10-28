import { NextResponse } from "next/server";
import { acceptInboxItemSchema } from "@/features/inbox/schemas/inbox-api.schema";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { INBOX_ERRORS } from "@/features/inbox/server/infrastructure/http/inbox.http-errors";
import { serializeTransaction } from "@/features/transaction/lib/serialize";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, acceptInboxItemSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await inboxUseCases.accept.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(INBOX_ERRORS, result.error);
    return NextResponse.json(serializeTransaction(result.transaction), { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error accepting inbox item");
  }
}
