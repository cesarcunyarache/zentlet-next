export class TransactionListNotFoundError extends Error {
  constructor(listId: string) {
    super(`Transaction list "${listId}" was not found or the caller is not a member`);
    this.name = 'TransactionListNotFoundError';
  }
}

export class TransactionListIdTakenError extends Error {
  constructor(id: string) {
    super(`Transaction list id "${id}" already belongs to another user`);
    this.name = 'TransactionListIdTakenError';
  }
}

export class TransactionListForbiddenError extends Error {
  constructor(listId: string) {
    super(`Caller does not have permission to perform this action on transaction list "${listId}"`);
    this.name = 'TransactionListForbiddenError';
  }
}

export class TransactionListPrivateError extends Error {
  constructor(listId: string) {
    super(`Transaction list "${listId}" is private and cannot be shared`);
    this.name = 'TransactionListPrivateError';
  }
}

export class TransactionListMembershipNotFoundError extends Error {
  constructor(listId: string, userId: string) {
    super(`User "${userId}" is not a member of transaction list "${listId}"`);
    this.name = 'TransactionListMembershipNotFoundError';
  }
}

export class TransactionListInviteInvalidError extends Error {
  constructor() {
    super('Transaction list invite is missing, expired, revoked, or already used');
    this.name = 'TransactionListInviteInvalidError';
  }
}

export class TransactionListOwnerCannotLeaveError extends Error {
  constructor(listId: string) {
    super(`The owner of transaction list "${listId}" must transfer ownership before leaving`);
    this.name = 'TransactionListOwnerCannotLeaveError';
  }
}
