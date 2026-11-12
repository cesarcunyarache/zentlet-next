export class CategoryNotOwnedError extends Error {
  constructor(categoryId: string) {
    super(`Category "${categoryId}" was not found or is not owned by this user`);
    this.name = 'CategoryNotOwnedError';
  }
}

export class TransactionNotFoundError extends Error {
  constructor(id: string) {
    super(`Transaction "${id}" was not found`);
    this.name = 'TransactionNotFoundError';
  }
}

export class TransactionIdTakenError extends Error {
  constructor(id: string) {
    super(`Transaction id "${id}" already belongs to another user`);
    this.name = 'TransactionIdTakenError';
  }
}

export class InvalidTransactionAmountError extends Error {
  constructor(amount: number) {
    super(`Transaction amount must be a positive number, received ${amount}`);
    this.name = 'InvalidTransactionAmountError';
  }
}

export class InvalidTransactionCursorError extends Error {
  constructor() {
    super('Transaction feed cursor is invalid');
    this.name = 'InvalidTransactionCursorError';
  }
}
