import { NextResponse } from "next/server";
import { addInboxSenderSchema } from "@/features/inbox/schemas/inbox-api.schema";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { INBOX_ERRORS } from "@/features/inbox/server/infrastructure/http/inbox.http-errors";
import { serializeInboxSender } from "@/features/inbox/lib/serialize";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, addInboxSenderSchema);
    if ("error" in parsed) return parsed.error;

    const result = await inboxUseCases.trustSender.execute(userId, parsed.data.address);
    if ("error" in result) return errorFrom(INBOX_ERRORS, result.error);
    return NextResponse.json(serializeInboxSender(result.sender), { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error adding sender");
  }
}
