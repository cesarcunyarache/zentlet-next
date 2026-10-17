import type { ErrorTable } from "@/lib/api/route-helpers";
import type { BudgetError } from "../../domain/errors/budget.errors";

export const BUDGET_ERRORS: ErrorTable<BudgetError> = {
  not_found: ["Budget not found", 404],
  id_taken: ["Budget id already in use", 409],
  category_not_found: ["Category not found", 422],
  list_not_found: ["List not found", 422],
  category_has_budget: ["Category already has a budget in this list", 409],
  alert_above_limit: ["alerts: must be below the budget limit", 422],
  invalid_period_start: ["Invalid period start", 422],
  limit_before_start: ["Limit before budget start", 422],
  single_period: ["One-time budget has a single period", 422],
};
