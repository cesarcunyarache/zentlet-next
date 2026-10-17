import { NextResponse } from "next/server";
import { budgetLimitSchema } from "@/features/budget/schemas/budget-api.schema";
import { isoDate } from "@/features/transaction/schemas/transaction-api.schema";
import { budgetUseCases } from "@/features/budget/server/infrastructure/budget.container";
import { serializeBudget } from "@/features/budget/lib/serialize";
import { BUDGET_ERRORS } from "@/features/budget/server/infrastructure/http/budget.http-errors";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string; effectiveFrom: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id, effectiveFrom } = await params;
    const isValidDate = isoDate.safeParse(effectiveFrom).success;
    if (!isValidDate) return errorFrom(BUDGET_ERRORS, "invalid_period_start");

    const parsed = await parseBody(req, budgetLimitSchema);
    if ("error" in parsed) return parsed.error;

    const result = await budgetUseCases.setLimit.execute(userId, id, effectiveFrom, parsed.data);
    if ("error" in result) return errorFrom(BUDGET_ERRORS, result.error);
    return NextResponse.json(serializeBudget(result.budget));
  } catch (error) {
    return internalError(req, error, "Error updating budget limit");
  }
}
