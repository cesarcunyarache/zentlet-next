"use client";

import { useState } from "react";
import { cleanAmountInput } from "@/lib/money";
import { useTransactionSummary } from "@/features/transaction/stores/transaction.store";
import type { CategoryBase } from "@/features/category/types";
import { track } from "@/lib/observability/client";
import { draftFrom, draftStatus, toggledKind, type BudgetDraft } from "../lib/draft";
import { BUDGET_PERIODS, periodContaining, todayISO } from "../lib/period";
import { useBudgetStore } from "../stores/budget.store";
import type { BudgetPeriod } from "../types";

interface UseBudgetSheetOptions {
  category: CategoryBase | null;
  onSaved: () => void;
  onRemoved: () => void;
}

const THOUSANDS_SEPARATOR = /,/g;

export function useBudgetSheet({ category, onSaved, onRemoved }: UseBudgetSheetOptions) {
  const today = todayISO();
  const { budgets, saveBudget, deleteBudget } = useBudgetStore();

  const [shown, setShown] = useState<CategoryBase | null>(null);
  const [opened, setOpened] = useState<CategoryBase | null>(null);
  const [draft, setDraft] = useState<BudgetDraft>(() => draftFrom(undefined, today));
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  const budgetFor = (categoryId: string) => budgets.find((budget) => budget.categoryId === categoryId);

  if (category !== opened) {
    setOpened(category);
    if (category) {
      setShown(category);
      setDraft(draftFrom(budgetFor(category.id), today));
      setIsConfirmingRemove(false);
    }
  }

  const budget = shown ? budgetFor(shown.id) : undefined;
  const { amount, canSave } = draftStatus(draft, budget, today);
  const range = periodContaining(BUDGET_PERIODS[draft.period], today);
  const { data: summary } = useTransactionSummary(range);
  const spent = shown ? (summary?.byCategory[shown.id]?.expense ?? 0) : 0;

  const updateDraft = (changes: Partial<BudgetDraft>) => setDraft((current) => ({ ...current, ...changes }));

  function save() {
    if (!shown || !canSave) return;
    saveBudget({ categoryId: shown.id, amount, period: draft.period, kind: draft.kind });
    track("budget_saved", { created: !budget, period: draft.period, kind: draft.kind });
    onSaved();
  }

  function remove() {
    if (!budget) return;
    if (!isConfirmingRemove) return setIsConfirmingRemove(true);
    deleteBudget(budget.id);
    track("budget_deleted", {});
    onRemoved();
  }

  return {
    shown,
    hasBudget: Boolean(budget),
    draft,
    amount,
    canSave,
    range,
    spent,
    today,
    isConfirmingRemove,
    changePeriod: (period: BudgetPeriod) => updateDraft({ period }),
    toggleKind: () => setDraft((current) => ({ ...current, kind: toggledKind(current.kind) })),
    changeAmount: (input: string) => updateDraft({ rawAmount: cleanAmountInput(input.replace(THOUSANDS_SEPARATOR, "")) }),
    save,
    remove,
  };
}
