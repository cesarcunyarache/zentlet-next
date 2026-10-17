import { NextResponse } from "next/server";
import { inboxUseCases } from "@/features/inbox/server/infrastructure/inbox.container";
import { INBOX_ERRORS } from "@/features/inbox/server/infrastructure/http/inbox.http-errors";
import { errorFrom, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id } = await params;
    const result = await inboxUseCases.dismiss.execute(userId, id);
    if ("error" in result) return errorFrom(INBOX_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error dismissing inbox item");
  }
}
