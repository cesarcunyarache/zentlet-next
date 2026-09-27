import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { budgetLimitSchema } from "@/features/budget/schemas/budget-api.schema";
import { isPeriodStart } from "@/features/budget/lib/period";
import type { BudgetPeriodUnit } from "@/features/budget/types";
import { isoDate } from "@/features/transaction/schemas/transaction-api.schema";
import { BUDGET_LIMITS, serializeBudget } from "@/features/budget/lib/serialize";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string; effectiveFrom: string }> };

/**
 * Tope desde un periodo en adelante. El periodo lo elige el cliente: un
 * cambio hecho sin conexión se aplica al mes en que se hizo, no al de su
 * sincronización. Repetirlo pisa la misma fila.
 */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const { id, effectiveFrom } = await params;
    if (!isoDate.safeParse(effectiveFrom).success) return errorResponse("Invalid period start", 422);

    const parsed = await parseBody(req, budgetLimitSchema);
    if ("error" in parsed) return parsed.error;

    const budget = await prisma.budget.findFirst({
      where: { id, userId },
      select: { startDate: true, kind: true, periodUnit: true, periodCount: true },
    });
    if (!budget) return errorResponse("Budget not found", 404);

    const rule = { periodUnit: budget.periodUnit as BudgetPeriodUnit, periodCount: budget.periodCount };
    if (!isPeriodStart(rule, effectiveFrom)) return errorResponse("Invalid period start", 422);

    const start = new Date(effectiveFrom);
    if (start < budget.startDate) return errorResponse("Limit before budget start", 422);
    if (budget.kind === "once" && start.getTime() !== budget.startDate.getTime()) {
      return errorResponse("One-time budget has a single period", 422);
    }

    const { amount } = parsed.data;
    await prisma.budgetLimit.upsert({
      where: { budgetId_effectiveFrom: { budgetId: id, effectiveFrom: start } },
      create: { budgetId: id, effectiveFrom: start, amount },
      update: { amount },
    });

    const updated = await prisma.budget.findUnique({ where: { id }, include: BUDGET_LIMITS });
    if (!updated) return errorResponse("Budget not found", 404);

    return NextResponse.json(serializeBudget(updated));
  } catch (error) {
    return internalError(req, error, "Error updating budget limit");
  }
}
