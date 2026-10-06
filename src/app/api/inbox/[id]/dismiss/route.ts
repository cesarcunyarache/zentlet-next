import { NextResponse } from "next/server";
// import { requireFeature } from "@/features/billing/http/guard";
import { dismissInboxItem } from "@/features/inbox/server/review";
import { errorResponse, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    // TODO: gating Pro desactivado temporalmente para pruebas

    // const denied = await requireFeature(userId, "email_import");

    // if (denied) return denied;

    const { id } = await params;
    const result = await dismissInboxItem(userId, id);
    if ("error" in result) return errorResponse("Inbox item not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error dismissing inbox item");
  }
}
