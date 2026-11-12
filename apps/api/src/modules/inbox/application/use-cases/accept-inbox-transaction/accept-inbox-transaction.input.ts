export type AcceptInboxTransactionInput = {
  description: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  transactionDate: string;
};
