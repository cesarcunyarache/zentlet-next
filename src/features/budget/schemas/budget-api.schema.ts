import { z } from "zod";
import { isoDate } from "@/features/transaction/schemas/transaction-api.schema";
import { MAX_ALERTS } from "../lib/alerts";
import { budgetPeriodOf, isPeriodStart } from "../lib/period";

const amount = z.number().positive().multipleOf(0.01).max(9_999_999_999);

export const createBudgetSchema = z
  .object({
    id: z.uuid(),
    categoryId: z.string().min(1).max(64),
    kind: z.enum(["recurring", "once"]).default("recurring"),
    periodUnit: z.enum(["week", "half_month", "month", "year"]),
    periodCount: z.number().int(),
    startDate: isoDate,
    amount,
  })
  .refine((budget) => budgetPeriodOf(budget) !== null, { path: ["periodCount"], message: "Periodo no admitido" })
  .refine((budget) => budgetPeriodOf(budget) === null || isPeriodStart(budget, budget.startDate), {
    path: ["startDate"],
    message: "Debe ser el inicio de un periodo",
  });

export const budgetLimitSchema = z.object({ amount });

const MAX_PERCENT = 100;

const budgetAlertSchema = z
  .object({ kind: z.enum(["percent", "amount"]), value: amount })
  .refine((alert) => alert.kind === "amount" || (Number.isInteger(alert.value) && alert.value < MAX_PERCENT), {
    path: ["value"],
    message: "Porcentaje entre 1 y 99",
  });

export const budgetAlertsSchema = z.object({
  alerts: z
    .array(budgetAlertSchema)
    .max(MAX_ALERTS)
    .refine((alerts) => new Set(alerts.map(({ kind, value }) => `${kind}:${value}`)).size === alerts.length, {
      message: "Alertas repetidas",
    }),
});
