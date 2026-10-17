import { NextResponse } from "next/server";
import { budgetAlertsSchema } from "@/features/budget/schemas/budget-api.schema";
import { budgetUseCases } from "@/features/budget/server/infrastructure/budget.container";
import { serializeAlert } from "@/features/budget/lib/serialize";
import { BUDGET_ERRORS } from "@/features/budget/server/infrastructure/http/budget.http-errors";
import { errorFrom, getSessionUserId, internalError, parseBody, unauthorized, writeLimit } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const result = await budgetUseCases.listAlerts.execute(userId, id);
    if ("error" in result) return errorFrom(BUDGET_ERRORS, result.error);
    return NextResponse.json(result.alerts.map(serializeAlert));
  } catch (error) {
    return internalError(req, error, "Error fetching budget alerts");
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, budgetAlertsSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const result = await budgetUseCases.replaceAlerts.execute(userId, id, parsed.data);
    if ("error" in result) return errorFrom(BUDGET_ERRORS, result.error);
    return NextResponse.json(result.alerts.map(serializeAlert));
  } catch (error) {
    return internalError(req, error, "Error updating budget alerts");
  }
}
