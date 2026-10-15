import { NextResponse } from "next/server";
import { createListSchema } from "@/features/list/schemas/list-api.schema";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/list.http-errors";
import { serializeList } from "@/features/list/lib/serialize";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { lists } = await listUseCases.list.execute(userId);
    return NextResponse.json(lists.map(serializeList));
  } catch (error) {
    return internalError(req, error, "Error fetching lists");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, createListSchema);
    if ("error" in parsed) return parsed.error;

    const result = await listUseCases.create.execute(userId, parsed.data);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return NextResponse.json(serializeList(result.list), { status: result.created ? 201 : 200 });
  } catch (error) {
    return internalError(req, error, "Error creating list");
  }
}
