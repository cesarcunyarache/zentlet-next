import { runInBackground } from "@/lib/background";
import { reportError } from "@/lib/observability/server";
import { CheckBudgetUseCase } from "../application/use-cases/check-budget.use-case";
import { accountPreferences, budgetNotifier } from "./budget.adapters";
import { PrismaBudgetRepository } from "./persistence/prisma/prisma-budget.repository";

const checkBudgetUseCase = new CheckBudgetUseCase(new PrismaBudgetRepository(), accountPreferences, budgetNotifier);

export function checkBudget(userId: string, categoryId: string) {
  return checkBudgetUseCase.execute(userId, categoryId);
}

export function scheduleBudgetCheck(userId: string, categoryId: string) {
  runInBackground(() =>
    checkBudget(userId, categoryId).catch((error) => reportError(error, "budget.check_failed", { userId, categoryId })),
  );
}
