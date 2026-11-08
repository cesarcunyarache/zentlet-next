// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetTour } from "../useBudgetTour";

const onboarding = { open: false };
const budgetStore = { budgets: [] as unknown[], isLoading: false };
const preferences = { isBudgetTourSeen: false, markBudgetTourSeen: vi.fn() };

vi.mock("@/features/onboarding/hooks/useOnboarding", () => ({ useOnboarding: () => onboarding }));
vi.mock("@/features/budget/stores/budget.store", () => ({ useBudgetStore: () => budgetStore }));
vi.mock("@/features/preference/hooks/useDisplayPreferences", () => ({ useDisplayPreferences: () => preferences }));

function setup(isBlocked = false) {
  const hook = renderHook(() => useBudgetTour({ isBlocked }));
  act(() => vi.advanceTimersByTime(1000));
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers();
  onboarding.open = false;
  budgetStore.budgets = [];
  budgetStore.isLoading = false;
  preferences.isBudgetTourSeen = false;
  preferences.markBudgetTourSeen.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("useBudgetTour", () => {
  it("no aparece de inmediato: espera a que la pantalla se asiente", () => {
    const { result } = renderHook(() => useBudgetTour({ isBlocked: false }));

    expect(result.current.isActive).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.isActive).toBe(true);
  });

  it("aparece cuando no hay presupuestos y nunca se vio", () => {
    expect(setup().result.current.isActive).toBe(true);
  });

  it("no aparece si ya existe algún presupuesto", () => {
    budgetStore.budgets = [{ id: "b1" }];

    expect(setup().result.current.isActive).toBe(false);
  });

  it("no aparece mientras cargan los presupuestos, para no mostrarse a quien ya tiene uno", () => {
    budgetStore.isLoading = true;

    expect(setup().result.current.isActive).toBe(false);
  });

  it("no aparece si ya se vio", () => {
    preferences.isBudgetTourSeen = true;

    expect(setup().result.current.isActive).toBe(false);
  });

  it("no aparece durante el onboarding ni con otra pantalla abierta", () => {
    onboarding.open = true;
    expect(setup().result.current.isActive).toBe(false);

    onboarding.open = false;
    expect(setup(true).result.current.isActive).toBe(false);
  });

  it("completarlo lo marca como visto", () => {
    const { result } = setup();

    act(() => result.current.complete());

    expect(preferences.markBudgetTourSeen).toHaveBeenCalledOnce();
  });
});
