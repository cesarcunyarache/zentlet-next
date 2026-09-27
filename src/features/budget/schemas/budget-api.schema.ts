import { z } from "zod";
import { isoDate } from "@/features/transaction/schemas/transaction-api.schema";
import { budgetPeriodOf, isPeriodStart } from "../lib/period";

const amount = z.number().positive().max(9_999_999_999);

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
