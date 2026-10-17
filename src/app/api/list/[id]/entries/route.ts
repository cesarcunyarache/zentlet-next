import { NextResponse } from "next/server";
import { assignEntriesSchema, listEntriesQuerySchema } from "@/features/list/schemas/list-api.schema";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/http/list.http-errors";
import { serializeEntry } from "@/features/list/lib/serialize";
import type { TListEntryPage } from "@/features/list/types";
import { errorFrom, getSessionUserId, internalError, parseBody, parseQuery, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const parsed = parseQuery(req, listEntriesQuerySchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await listUseCases.entries.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    const page: TListEntryPage = { items: result.items.map(serializeEntry), nextCursor: result.nextCursor };
    return NextResponse.json(page);
  } catch (error) {
    return internalError(req, error, "Error fetching list entries");
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, assignEntriesSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await listUseCases.assign.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return NextResponse.json({ assigned: result.assigned });
  } catch (error) {
    return internalError(req, error, "Error adding to list");
  }
}
