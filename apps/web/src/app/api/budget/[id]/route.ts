import { NextResponse } from "next/server";
import { budgetUseCases } from "@/features/budget/server/infrastructure/budget.container";
import { BUDGET_ERRORS } from "@/features/budget/server/infrastructure/http/budget.http-errors";
import { errorFrom, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id } = await params;
    const result = await budgetUseCases.delete.execute(userId, id);
    if ("error" in result) return errorFrom(BUDGET_ERRORS, result.error);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error deleting budget");
  }
}
