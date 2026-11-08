// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHomeSummary } from "../useHomeSummary";

const budgetStore = { budgets: [] as unknown[], isLoading: false };

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/features/budget/stores/budget.store", () => ({ useBudgetStore: () => budgetStore }));
vi.mock("@/features/budget/hooks/useBudgetBars", () => ({ useBudgetBars: () => new Map() }));
vi.mock("@/features/transaction/stores/transaction.store", () => ({
  useTransactionSummary: () => ({ data: undefined }),
}));

const options = {
  summaryFilters: {},
  range: {},
  listId: "private",
  kind: null,
  categoryId: null,
  categories: [],
  categoriesById: new Map(),
};

beforeEach(() => {
  budgetStore.budgets = [];
  budgetStore.isLoading = false;
});

describe("useHomeSummary", () => {
  it("la tira no está lista mientras cargan los presupuestos, para no pintar barras sin su borde", () => {
    budgetStore.isLoading = true;

    const { result } = renderHook(() => useHomeSummary(options));

    expect(result.current.isStripReady).toBe(false);
  });

  it("la tira está lista cuando los presupuestos ya cargaron, tenga o no alguno", () => {
    const { result } = renderHook(() => useHomeSummary(options));

    expect(result.current.isStripReady).toBe(true);
  });
});
