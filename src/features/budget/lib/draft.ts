import { parseAmount } from "@/features/transaction/lib/format";
import type { BudgetKind, BudgetPeriod, TBudget } from "../types";
import { activePeriod, budgetPeriodOf, limitAt } from "./period";

export interface BudgetDraft {
  period: BudgetPeriod;
  kind: BudgetKind;
  rawAmount: string;
}

export interface BudgetDraftStatus {
  amount: number;
  canSave: boolean;
}

const DEFAULT_PERIOD: BudgetPeriod = "monthly";
const DEFAULT_KIND: BudgetKind = "recurring";

export function currentLimit(budget: TBudget | undefined, today: string): number | null {
  if (!budget) return null;
  const period = activePeriod(budget, today);
  return period ? limitAt(budget, period.from) : null;
}

export function draftFrom(budget: TBudget | undefined, today: string): BudgetDraft {
  const limit = currentLimit(budget, today);
  return {
    period: (budget && budgetPeriodOf(budget)) ?? DEFAULT_PERIOD,
    kind: budget?.kind ?? DEFAULT_KIND,
    rawAmount: limit ? String(limit) : "",
  };
}

export function draftStatus(draft: BudgetDraft, budget: TBudget | undefined, today: string): BudgetDraftStatus {
  const saved = draftFrom(budget, today);
  const limit = currentLimit(budget, today);
  const isActive = limit !== null;
  const changesRule = isActive && (draft.period !== saved.period || draft.kind !== saved.kind);
  const amount = parseAmount(draft.rawAmount);
  return { amount, canSave: amount > 0 && (!isActive || changesRule || amount !== limit) };
}

export function toggledKind(kind: BudgetKind): BudgetKind {
  return kind === "recurring" ? "once" : "recurring";
}
