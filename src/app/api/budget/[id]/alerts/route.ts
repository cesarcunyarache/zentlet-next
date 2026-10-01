import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { budgetAlertsSchema } from "@/features/budget/schemas/budget-api.schema";
import { isAlertBelowLimit } from "@/features/budget/lib/alerts";
import { serializeAlert } from "@/features/budget/lib/serialize";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { requireFeature } from "@/features/billing/server/guard";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  isForeignKeyViolation,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const notFound = () => errorResponse("Budget not found", 404);

const ALERT_ORDER = [{ kind: "asc" }, { value: "asc" }] as const;

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const budget = await prisma.budget.findFirst({
      where: { id, userId },
      select: { alerts: { orderBy: [...ALERT_ORDER] } },
    });
    if (!budget) return notFound();

    return NextResponse.json(budget.alerts.map(serializeAlert));
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

    const denied = await requireFeature(userId, "budgets");
    if (denied) return denied;

    const parsed = await parseBody(req, budgetAlertsSchema);
    if ("error" in parsed) return parsed.error;
    const { alerts } = parsed.data;

    const { id } = await params;
    const budget = await prisma.budget.findFirst({
      where: { id, userId },
      select: { categoryId: true, limits: { orderBy: { effectiveFrom: "desc" }, take: 1, select: { amount: true } } },
    });
    if (!budget) return notFound();

    const currentLimit = Number(budget.limits[0]?.amount ?? 0);
    if (!alerts.every((alert) => isAlertBelowLimit(alert, currentLimit))) {
      return errorResponse("alerts: must be below the budget limit", 422);
    }

    const [, , saved] = await prisma.$transaction([
      prisma.budgetAlert.deleteMany({ where: { budgetId: id } }),
      prisma.budgetAlert.createMany({ data: alerts.map((alert) => ({ ...alert, budgetId: id })) }),
      prisma.budgetAlert.findMany({ where: { budgetId: id }, orderBy: [...ALERT_ORDER] }),
    ]);
    scheduleBudgetCheck(userId, budget.categoryId);

    return NextResponse.json(saved.map(serializeAlert));
  } catch (error) {
    if (isForeignKeyViolation(error)) return notFound();
    return internalError(req, error, "Error updating budget alerts");
  }
}
