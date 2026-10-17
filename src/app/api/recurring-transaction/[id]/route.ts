import { NextResponse } from "next/server";
import { getRecurringTransaction, stopRecurringTransaction } from "@/features/recurring/server/recurring";
import { errorResponse, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const notFound = () => errorResponse("Recurring transaction not found", 404);

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const recurring = await getRecurringTransaction(userId, (await params).id);
    return recurring ? NextResponse.json(recurring) : notFound();
  } catch (error) {
    return internalError(req, error, "Error fetching recurring transaction");
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const stopped = await stopRecurringTransaction(userId, (await params).id);
    if (stopped === "not_found") return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error stopping recurring transaction");
  }
}
