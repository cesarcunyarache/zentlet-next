import prisma from "@/lib/prisma";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";
import type { PeriodRange } from "../../../../types";
import type { NewBudget, NewBudgetAlert } from "../../../domain/entities/budget.entity";
import type { BudgetRepository } from "../../../domain/repositories/budget.repository";
import { alertToDomain, scheduleToDomain, toBudgetWithAlerts, toDomain, toPersistence } from "./budget.mapper";

const WITH_LIMITS = { limits: { orderBy: { effectiveFrom: "asc" } } } as const;

const ALERT_ORDER = [{ kind: "asc" }, { value: "asc" }] as const;

export class PrismaBudgetRepository implements BudgetRepository {
  async findAll(userId: string) {
    const rows = await prisma.budget.findMany({
      where: { userId },
      include: WITH_LIMITS,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toDomain);
  }

  async findById(id: string) {
    const row = await prisma.budget.findUnique({ where: { id }, include: WITH_LIMITS });
    if (!row) return null;
    return toDomain(row);
  }

  async findOwned(userId: string, id: string) {
    const row = await prisma.budget.findFirst({ where: { id, userId }, include: WITH_LIMITS });
    if (!row) return null;
    return toDomain(row);
  }

  async findSchedule(userId: string, id: string) {
    const row = await prisma.budget.findFirst({
      where: { id, userId },
      select: { startDate: true, kind: true, periodUnit: true, periodCount: true },
    });
    if (!row) return null;
    return scheduleToDomain(row);
  }

  async findCurrentLimit(userId: string, id: string) {
    const row = await prisma.budget.findFirst({
      where: { id, userId },
      select: { categoryId: true, limits: { orderBy: { effectiveFrom: "desc" }, take: 1, select: { amount: true } } },
    });
    if (!row) return null;
    return { categoryId: row.categoryId, currentLimit: Number(row.limits[0]?.amount ?? 0) };
  }

  async findByCategory(userId: string, categoryId: string) {
    const rows = await prisma.budget.findMany({
      where: { userId, categoryId },
      include: { ...WITH_LIMITS, alerts: true, category: { select: { name: true } } },
    });
    return rows.map(toBudgetWithAlerts);
  }

  async findAlerts(userId: string, id: string) {
    const row = await prisma.budget.findFirst({
      where: { id, userId },
      select: { alerts: { orderBy: [...ALERT_ORDER] } },
    });
    if (!row) return null;
    return row.alerts.map(alertToDomain);
  }

  async insert(budget: NewBudget) {
    try {
      return toDomain(await prisma.budget.create({ data: toPersistence(budget), include: WITH_LIMITS }));
    } catch (error) {
      if (isUniqueViolation(error)) return "already_exists" as const;
      throw error;
    }
  }

  async setLimit(id: string, effectiveFrom: Date, amount: number) {
    try {
      await prisma.budgetLimit.upsert({
        where: { budgetId_effectiveFrom: { budgetId: id, effectiveFrom } },
        create: { budgetId: id, effectiveFrom, amount },
        update: { amount },
      });
      return "saved" as const;
    } catch (error) {
      if (isForeignKeyViolation(error)) return "not_found" as const;
      throw error;
    }
  }

  async replaceAlerts(id: string, alerts: NewBudgetAlert[]) {
    try {
      const [, , saved] = await prisma.$transaction([
        prisma.budgetAlert.deleteMany({ where: { budgetId: id } }),
        prisma.budgetAlert.createMany({ data: alerts.map((alert) => ({ ...alert, budgetId: id })) }),
        prisma.budgetAlert.findMany({ where: { budgetId: id }, orderBy: [...ALERT_ORDER] }),
      ]);
      return saved.map(alertToDomain);
    } catch (error) {
      if (isForeignKeyViolation(error)) return "not_found" as const;
      throw error;
    }
  }

  async deleteOwned(userId: string, id: string) {
    const { count } = await prisma.budget.deleteMany({ where: { id, userId } });
    if (count === 0) return "not_found" as const;
    return "deleted" as const;
  }

  async categoryBelongsTo(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }

  async spentIn(userId: string, categoryId: string, listId: string, { from, to }: PeriodRange) {
    const { _sum } = await prisma.transaction.aggregate({
      where: { userId, categoryId, listId, type: "expense", transactionDate: { gte: new Date(from), lt: new Date(to) } },
      _sum: { amount: true },
    });
    return Number(_sum.amount ?? 0);
  }
}
