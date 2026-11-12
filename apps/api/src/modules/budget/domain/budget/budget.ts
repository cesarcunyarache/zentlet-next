export type BudgetKind = 'recurring' | 'once';

export type BudgetPeriodUnit = 'week' | 'half_month' | 'month' | 'year';

export type Budget = {
  id: string;
  userId: string;
  categoryId: string;
  listId: string;
  kind: BudgetKind;
  periodUnit: BudgetPeriodUnit;
  periodCount: number;
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
};
