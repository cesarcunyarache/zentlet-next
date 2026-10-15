import { NextResponse } from "next/server";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/list.http-errors";
import { errorFrom, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string; transactionId: string }> };

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id, transactionId } = await params;
    const result = await listUseCases.removeEntry.execute(userId, id, transactionId);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error removing from list");
  }
}
