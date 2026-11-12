export type TransactionType = 'expense' | 'income';

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string | null;
  reference: string | null;
  transactionDate: Date;
  recurringTransactionId: string | null;
  listId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TransactionPatch = Partial<
  Pick<Transaction, 'description' | 'reference' | 'amount' | 'categoryId' | 'transactionDate'>
>;

export type TransactionFilters = {
  userId: string;
  type?: TransactionType;
  categoryId?: string;
  listId?: string;
  from?: Date;
  to?: Date;
};

export type FeedCursor = {
  transactionDate: Date;
  createdAt: Date;
  id: string;
};
