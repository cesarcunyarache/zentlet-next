import type { CreateBudgetPayload } from "../services/budget.service";
import type { BudgetKind, BudgetPeriod, TBudget } from "../types";
import { BUDGET_PERIODS, activePeriod, periodContaining } from "./period";

export interface BudgetInput {
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  kind: BudgetKind;
}

export interface BudgetSavePlan {
  remove?: string;
  create?: Omit<CreateBudgetPayload, "id">;
  limit?: { budgetId: string; effectiveFrom: string; amount: number };
}

export function planBudgetSave(existing: TBudget | undefined, input: BudgetInput, date: string): BudgetSavePlan {
  const rule = BUDGET_PERIODS[input.period];
  const current = periodContaining(rule, date);
  const keepsRule =
    existing?.periodUnit === rule.periodUnit &&
    existing.periodCount === rule.periodCount &&
    existing.kind === input.kind &&
    activePeriod(existing, date) !== null;

  if (existing && keepsRule) {
    return { limit: { budgetId: existing.id, effectiveFrom: current.from, amount: input.amount } };
  }
  const create = { categoryId: input.categoryId, kind: input.kind, ...rule, startDate: current.from, amount: input.amount };
  return existing ? { remove: existing.id, create } : { create };
}
