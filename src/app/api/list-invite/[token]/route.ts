import { NextResponse } from "next/server";
import { inviteTokenSchema } from "@/features/list/schemas/list-api.schema";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/list.http-errors";
import { serializeInvitePreview } from "@/features/list/lib/serialize";
import { PENDING_INVITE_COOKIE } from "@/features/list/lib/pending-invite";
import { errorFrom, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ token: string }> };

function forgetPendingInvite(response: NextResponse) {
  response.cookies.delete(PENDING_INVITE_COOKIE);
  return response;
}

async function readToken({ params }: RouteContext) {
  const parsed = inviteTokenSchema.safeParse((await params).token);
  return parsed.success ? parsed.data : null;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const token = await readToken(context);
    if (!token) return forgetPendingInvite(errorFrom(LIST_ERRORS, "invite_invalid"));

    const result = await listUseCases.previewInvite.execute(userId, token);
    if ("error" in result) return forgetPendingInvite(errorFrom(LIST_ERRORS, result.error));
    return forgetPendingInvite(NextResponse.json(serializeInvitePreview(result.invite, result.isMember)));
  } catch (error) {
    return internalError(req, error, "Error fetching invite");
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const token = await readToken(context);
    if (!token) return errorFrom(LIST_ERRORS, "invite_invalid");

    const result = await listUseCases.acceptInvite.execute(userId, token);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return NextResponse.json(result);
  } catch (error) {
    return internalError(req, error, "Error accepting invite");
  }
}
