"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { fetchSummaryWithPending, transactionKeys } from "@/features/transaction/stores/transaction.store";
import type { BudgetBar } from "@/features/transaction/lib/strip-data";
import type { DateRange } from "@/features/transaction/types";
import { todayISO } from "../lib/period";
import { budgetMeasurements } from "../lib/progress";
import type { PeriodRange, TBudget } from "../types";

const rangeKey = ({ from, to }: PeriodRange) => `${from}/${to}`;

/**
 * Tope y gasto de cada presupuesto en su propio periodo. Usa los mismos
 * resúmenes que el panel: un gasto nuevo, también sin conexión, mueve la
 * barra al instante.
 */
export function useBudgetBars(budgets: TBudget[], view: DateRange): Map<string, BudgetBar> {
  const queryClient = useQueryClient();
  const measurements = budgetMeasurements(budgets, view, todayISO());
  const ranges = [...new Map(measurements.map(({ range }) => [rangeKey(range), range])).values()];

  const summaries = useQueries({
    queries: ranges.map((range) => ({
      queryKey: transactionKeys.summary(range),
      queryFn: () => fetchSummaryWithPending(queryClient, range),
    })),
  });
  const summaryByRange = new Map(ranges.map((range, index) => [rangeKey(range), summaries[index].data]));

  return new Map(
    measurements.map(({ categoryId, range, limit }) => [
      categoryId,
      { limit, spent: summaryByRange.get(rangeKey(range))?.byCategory[categoryId]?.expense ?? 0 },
    ]),
  );
}
