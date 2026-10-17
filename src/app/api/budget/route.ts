import { NextResponse } from "next/server";
import { createBudgetSchema } from "@/features/budget/schemas/budget-api.schema";
import { budgetUseCases } from "@/features/budget/server/infrastructure/budget.container";
import { serializeBudget } from "@/features/budget/lib/serialize";
import { BUDGET_ERRORS } from "@/features/budget/server/infrastructure/http/budget.http-errors";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const budgets = await budgetUseCases.list.execute(userId);
    return NextResponse.json(budgets.map(serializeBudget));
  } catch (error) {
    return internalError(req, error, "Error fetching budgets");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, createBudgetSchema);
    if ("error" in parsed) return parsed.error;

    const result = await budgetUseCases.create.execute(userId, parsed.data);
    if ("error" in result) return errorFrom(BUDGET_ERRORS, result.error);
    return NextResponse.json(serializeBudget(result.budget), {
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return internalError(req, error, "Error creating budget");
  }
}
