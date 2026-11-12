export class BudgetNotFoundError extends Error {
  constructor(id: string) {
    super(`Budget "${id}" was not found or is not owned by this user`);
    this.name = 'BudgetNotFoundError';
  }
}

export class BudgetIdTakenError extends Error {
  constructor(id: string) {
    super(`Budget id "${id}" already belongs to another user`);
    this.name = 'BudgetIdTakenError';
  }
}

export class DuplicateBudgetError extends Error {
  constructor(listId: string, categoryId: string) {
    super(`A budget already exists for list "${listId}" and category "${categoryId}"`);
    this.name = 'DuplicateBudgetError';
  }
}

export class CategoryNotOwnedError extends Error {
  constructor(categoryId: string) {
    super(`Category "${categoryId}" was not found or is not owned by this user`);
    this.name = 'CategoryNotOwnedError';
  }
}

export class TransactionListNotOwnedError extends Error {
  constructor(listId: string) {
    super(`Transaction list "${listId}" was not found or is not owned by this user`);
    this.name = 'TransactionListNotOwnedError';
  }
}

export class InvalidPeriodStartError extends Error {
  constructor(effectiveFrom: string) {
    super(`"${effectiveFrom}" is not the start of a budget period`);
    this.name = 'InvalidPeriodStartError';
  }
}

export class LimitBeforeStartDateError extends Error {
  constructor(effectiveFrom: string, startDate: string) {
    super(`Limit effective date "${effectiveFrom}" is before the budget's start date "${startDate}"`);
    this.name = 'LimitBeforeStartDateError';
  }
}

export class SinglePeriodLimitError extends Error {
  constructor(budgetId: string) {
    super(`Budget "${budgetId}" only runs once and can only have a limit for its original period`);
    this.name = 'SinglePeriodLimitError';
  }
}

export class AlertAboveLimitError extends Error {
  constructor(budgetId: string) {
    super(`Every alert threshold must stay below the current limit for budget "${budgetId}"`);
    this.name = 'AlertAboveLimitError';
  }
}
