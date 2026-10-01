import { NextResponse } from "next/server";
import { requireFeature } from "@/features/billing/server/guard";
import { acceptInboxItemSchema } from "@/features/inbox/schemas/inbox-api.schema";
import { acceptInboxItem } from "@/features/inbox/server/review";
import { serializeTransaction } from "@/features/transaction/lib/serialize";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const denied = await requireFeature(userId, "email_import");
    if (denied) return denied;

    const parsed = await parseBody(req, acceptInboxItemSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await acceptInboxItem(userId, id, parsed.data);
    if ("error" in result) {
      return result.error === "not_found"
        ? errorResponse("Inbox item not found", 404)
        : errorResponse("Category not found", 422);
    }
    return NextResponse.json(serializeTransaction(result.transaction), { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error accepting inbox item");
  }
}
