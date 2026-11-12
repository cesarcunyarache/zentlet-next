export type SetBudgetLimitInput = {
  userId: string;
  budgetId: string;
  effectiveFrom: Date;
  amount: number;
};
