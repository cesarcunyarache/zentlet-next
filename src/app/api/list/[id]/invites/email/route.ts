import { NextResponse } from "next/server";
import { emailInviteSchema } from "@/features/list/schemas/list-api.schema";
import { listUseCases } from "@/features/list/server/infrastructure/list.container";
import { LIST_ERRORS } from "@/features/list/server/infrastructure/list.http-errors";
import { serializeInvite } from "@/features/list/lib/serialize";
import { rateLimit } from "@/lib/rate-limit";
import {
  errorFrom,
  getSessionUserId,
  internalError,
  parseBody,
  tooManyRequests,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** Cada envío llega a un buzón ajeno: un tope diario evita usarlo para mandar spam. */
const EMAILS_PER_DAY = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, emailInviteSchema);
    if ("error" in parsed) return parsed.error;

    const { allowed } = await rateLimit(`list-invite-email:${userId}`, EMAILS_PER_DAY, DAY_MS);
    if (!allowed) return tooManyRequests("Too many invite emails", DAY_MS / 1000);

    const { id } = await params;
    const result = await listUseCases.emailInvite.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(LIST_ERRORS, result.error);
    return NextResponse.json(serializeInvite(result.invite), { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error sending invite email");
  }
}
