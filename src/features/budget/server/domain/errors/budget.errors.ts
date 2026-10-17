export type BudgetError =
  | "not_found"
  | "id_taken"
  | "category_not_found"
  | "list_not_found"
  | "category_has_budget"
  | "alert_above_limit"
  | "invalid_period_start"
  | "limit_before_start"
  | "single_period";

export const fail = <E extends BudgetError>(error: E) => ({ error });
