import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useBudgetBars } from "@/features/budget/hooks/useBudgetBars";
import { useBudgetStore } from "@/features/budget/stores/budget.store";
import { buildStripData, categoryValue } from "@/features/transaction/lib/strip-data";
import { useTransactionSummary } from "@/features/transaction/stores/transaction.store";
import type { CategoryLike, CategoryTotal, DateRange, SummaryFilters, TransactionType } from "@/features/transaction/types";
import { headlineFor } from "../lib/headline";

const ALL_TIME: DateRange = {};

interface UseHomeSummaryOptions {
  summaryFilters: SummaryFilters;
  range: DateRange;
  listId: string | null;
  kind: TransactionType | null;
  categoryId: string | null;
  categories: CategoryLike[];
  categoriesById: Map<string, CategoryLike>;
}

export function useHomeSummary({
  summaryFilters,
  range,
  listId,
  kind,
  categoryId,
  categories,
  categoriesById,
}: UseHomeSummaryOptions) {
  const t = useTranslations("transactions");
  const { budgets } = useBudgetStore();
  const { data: summary } = useTransactionSummary(summaryFilters);
  const { data: lifetime } = useTransactionSummary(ALL_TIME);

  const expenseTotal = summary?.expenseTotal ?? 0;
  const incomeTotal = summary?.incomeTotal ?? 0;
  const totalsByCategory = summary?.byCategory;

  const valueOfCategory = useCallback(
    (id: string) => categoryValue(totalsByCategory?.[id], kind),
    [totalsByCategory, kind],
  );

  const budgetBars = useBudgetBars(budgets, range, listId);
  const stripData = useMemo<CategoryTotal[]>(
    () =>
      buildStripData({
        categories,
        byCategory: totalsByCategory,
        kind,
        budgetFor: (id) => budgetBars.get(id) ?? null,
      }),
    [categories, totalsByCategory, kind, budgetBars],
  );

  const headline = useMemo(
    () =>
      headlineFor({
        categoryId,
        categoryName: categoryId ? categoriesById.get(categoryId)?.name : undefined,
        categoryValue: categoryId ? valueOfCategory(categoryId) : 0,
        kind,
        expenseTotal,
        incomeTotal,
        labels: {
          category: t("headline.category"),
          expenses: t("headline.expenses"),
          income: t("headline.income"),
          total: t("headline.total"),
        },
      }),
    [categoryId, categoriesById, valueOfCategory, kind, expenseTotal, incomeTotal, t],
  );

  return {
    expenseTotal,
    incomeTotal,
    lifetimeCount: lifetime?.count ?? 0,
    stripData,
    headline,
  };
}
