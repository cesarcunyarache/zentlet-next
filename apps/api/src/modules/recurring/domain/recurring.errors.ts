export class CategoryNotOwnedError extends Error {
  constructor(categoryId: string) {
    super(`Category "${categoryId}" was not found or is not owned by this user`);
    this.name = 'CategoryNotOwnedError';
  }
}

export class RecurringTransactionNotFoundError extends Error {
  constructor(id: string) {
    super(`Recurring transaction "${id}" was not found`);
    this.name = 'RecurringTransactionNotFoundError';
  }
}

export class InvalidRecurringAmountError extends Error {
  constructor(amount: number) {
    super(`Recurring transaction amount must be a positive number, received ${amount}`);
    this.name = 'InvalidRecurringAmountError';
  }
}
