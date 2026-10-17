import { NextResponse } from "next/server";
import { createInviteSchema } from "@/features/list/schemas/list-api.schema";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/http/list.http-errors";
import { serializeInvite } from "@/features/list/lib/serialize";
import type { TCreatedInvite } from "@/features/list/types";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const result = await listUseCases.invites.execute(userId, id);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return NextResponse.json(result.invites.map(serializeInvite));
  } catch (error) {
    return internalError(req, error, "Error fetching invites");
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, createInviteSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await listUseCases.createInvite.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    const created: TCreatedInvite = { ...serializeInvite(result.invite), token: result.token };
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error creating invite");
  }
}
