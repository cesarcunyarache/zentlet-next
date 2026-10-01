import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createBudgetSchema } from "@/features/budget/schemas/budget-api.schema";
import { BUDGET_LIMITS, serializeBudget } from "@/features/budget/lib/serialize";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  isUniqueViolation,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";
import { requireFeature } from "@/features/billing/server/guard";
import { DEFAULT_ALERTS } from "@/features/budget/lib/alerts";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: BUDGET_LIMITS,
      orderBy: { createdAt: "asc" },
    });

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

    const denied = await requireFeature(userId, "budgets");
    if (denied) return denied;

    const parsed = await parseBody(req, createBudgetSchema);
    if ("error" in parsed) return parsed.error;
    const { id, categoryId, kind, periodUnit, periodCount, startDate, amount } = parsed.data;

    const existing = await prisma.budget.findUnique({ where: { id }, include: BUDGET_LIMITS });
    if (existing) {
      return existing.userId === userId
        ? NextResponse.json(serializeBudget(existing), { status: 200 })
        : errorResponse("Budget id already in use", 409);
    }

    const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    if (!category) return errorResponse("Category not found", 422);

    try {
      const start = new Date(startDate);
      const budget = await prisma.budget.create({
        data: {
          id,
          categoryId,
          kind,
          periodUnit,
          periodCount,
          startDate: start,
          userId,
          limits: { create: { effectiveFrom: start, amount } },
          alerts: { create: DEFAULT_ALERTS },
        },
        include: BUDGET_LIMITS,
      });
      return NextResponse.json(serializeBudget(budget), { status: 201 });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const winner = await prisma.budget.findFirst({ where: { id, userId }, include: BUDGET_LIMITS });
      return winner
        ? NextResponse.json(serializeBudget(winner), { status: 200 })
        : errorResponse("Category already has a budget", 409);
    }
  } catch (error) {
    return internalError(req, error, "Error creating budget");
  }
}
