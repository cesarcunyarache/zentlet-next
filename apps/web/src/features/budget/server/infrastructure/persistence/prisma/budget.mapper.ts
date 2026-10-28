import type {
  BudgetAlert as BudgetAlertRow,
  BudgetLimit as BudgetLimitRow,
  Budget as BudgetRow,
} from "@/generated/prisma/client";
import type { BudgetAlert, BudgetAlertKind, BudgetKind, BudgetPeriodUnit } from "../../../../types";
import type { Budget, BudgetSchedule, BudgetWithAlerts, NewBudget } from "../../../domain/entities/budget.entity";

type BudgetWithLimitsRow = BudgetRow & { limits: Pick<BudgetLimitRow, "effectiveFrom" | "amount">[] };

type BudgetWithAlertsRow = BudgetWithLimitsRow & {
  alerts: Pick<BudgetAlertRow, "id" | "kind" | "value">[];
  category: { name: string };
};

export function toDomain(row: BudgetWithLimitsRow): Budget {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    listId: row.listId,
    kind: row.kind as BudgetKind,
    periodUnit: row.periodUnit as BudgetPeriodUnit,
    periodCount: row.periodCount,
    startDate: row.startDate,
    limits: row.limits.map((limit) => ({
      effectiveFrom: limit.effectiveFrom,
      amount: Number(limit.amount.toString()),
    })),
  };
}

export function toBudgetWithAlerts(row: BudgetWithAlertsRow): BudgetWithAlerts {
  return {
    ...toDomain(row),
    alerts: row.alerts.map(alertToDomain),
    categoryName: row.category.name,
  };
}

export function alertToDomain(row: Pick<BudgetAlertRow, "id" | "kind" | "value">): BudgetAlert {
  return { id: row.id, kind: row.kind as BudgetAlertKind, value: Number(row.value.toString()) };
}

export function scheduleToDomain(row: Pick<BudgetRow, "startDate" | "kind" | "periodUnit" | "periodCount">): BudgetSchedule {
  return {
    startDate: row.startDate,
    kind: row.kind as BudgetKind,
    periodUnit: row.periodUnit as BudgetPeriodUnit,
    periodCount: row.periodCount,
  };
}

export function toPersistence({ initialLimit, alerts, ...budget }: NewBudget) {
  return {
    ...budget,
    limits: { create: { effectiveFrom: budget.startDate, amount: initialLimit } },
    alerts: { create: alerts },
  };
}
