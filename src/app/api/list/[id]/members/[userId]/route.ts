import { NextResponse } from "next/server";
import { updateMemberSchema } from "@/features/list/schemas/list-api.schema";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/list.http-errors";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, updateMemberSchema);
    if ("error" in parsed) return parsed.error;

    const { id, userId: memberId } = await params;
    const result = await listUseCases.updateMember.execute(userId, id, memberId, parsed.data);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error updating member");
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id, userId: memberId } = await params;
    const result = await listUseCases.removeMember.execute(userId, id, memberId);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error removing member");
  }
}
