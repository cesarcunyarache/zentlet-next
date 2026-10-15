import { NextResponse } from "next/server";
import { updateListSchema } from "@/features/list/schemas/list-api.schema";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/list.http-errors";
import { serializeListDetail } from "@/features/list/lib/serialize";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const result = await listUseCases.get.execute(userId, id);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return NextResponse.json(serializeListDetail(result.list, result.role, result.breakdown));
  } catch (error) {
    return internalError(req, error, "Error fetching list");
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, updateListSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await listUseCases.update.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error updating list");
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id } = await params;
    const result = await listUseCases.delete.execute(userId, id);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error deleting list");
  }
}
