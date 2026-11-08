import { useEffect, useState } from "react";
import { useBudgetStore } from "@/features/budget/stores/budget.store";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { useDisplayPreferences } from "@/features/preference/hooks/useDisplayPreferences";

const SETTLE_MS = 800;

interface BudgetTourOptions {
  isBlocked: boolean;
}

export function useBudgetTour({ isBlocked }: BudgetTourOptions) {
  const { open: isOnboardingOpen } = useOnboarding();
  const { budgets, isLoading } = useBudgetStore();
  const { isBudgetTourSeen, markBudgetTourSeen } = useDisplayPreferences();
  const [isSettled, setIsSettled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const isActive =
    isSettled && !isBlocked && !isOnboardingOpen && !isLoading && budgets.length === 0 && !isBudgetTourSeen;

  return { isActive, complete: markBudgetTourSeen };
}
