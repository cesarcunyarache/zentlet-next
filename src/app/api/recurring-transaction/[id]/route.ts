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

    const isStopped = await stopRecurringTransaction(userId, (await params).id);
    return isStopped ? new NextResponse(null, { status: 204 }) : notFound();
  } catch (error) {
    return internalError(req, error, "Error stopping recurring transaction");
  }
}
