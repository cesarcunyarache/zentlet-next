import { NextResponse } from "next/server";
import { serializeRecurringTransaction } from "@/features/recurring/lib/serialize";
import { RECURRING_ERRORS } from "@/features/recurring/server/infrastructure/http/recurring.http-errors";
import { recurringUseCases } from "@/features/recurring/server/infrastructure/recurring.container";
import { errorFrom, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const result = await recurringUseCases.get.execute(userId, (await params).id);
    if ("error" in result) return errorFrom(RECURRING_ERRORS, result.error);
    return NextResponse.json(serializeRecurringTransaction(result.recurring));
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

    const result = await recurringUseCases.stop.execute(userId, (await params).id);
    if ("error" in result) return errorFrom(RECURRING_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error stopping recurring transaction");
  }
}
