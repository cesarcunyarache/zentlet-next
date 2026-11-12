// Mirrors @zentlet/api's transaction module `TransactionType` without importing
// it: this module only ever produces candidates, never a real Transaction.
export type TransactionType = 'expense' | 'income';

export type InboxTransaction = {
  id: string;
  userId: string;
  status: string;
  externalId: string;
  senderAddress: string;
  bank: string | null;
  subject: string;
  parser: string;
  isVerified: boolean;
  isNewSender: boolean;
  type: string;
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  description: string;
  categoryId: string | null;
  isLearned: boolean;
  transactionDate: Date;
  cardLast4: string | null;
  reference: string | null;
  duplicateOfId: string | null;
  transactionId: string | null;
  resolvedAt: Date | null;
  receivedAt: Date;
  createdAt: Date;
};

export type NewInboxTransaction = Omit<
  InboxTransaction,
  'id' | 'status' | 'transactionId' | 'resolvedAt' | 'createdAt' | 'type' | 'amount'
> & {
  type: TransactionType;
  amount: number;
};

export type AcceptedInboxTransactionDraft = {
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  transactionDate: Date;
  reference: string | null;
};

export type InboxTransactionAcceptance = {
  item: InboxTransaction;
  merchantKey: string | null;
  transaction: AcceptedInboxTransactionDraft;
};

export type MatchableCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type DateWindow = {
  from: Date;
  to: Date;
};

export type EmailMovement = {
  type: TransactionType;
  amount: number;
  currency: string | null;
  merchant: string | null;
  description: string;
  transactionDate: string | null;
  cardLast4: string | null;
  reference: string | null;
};

export type EmailHeader = {
  name: string;
  value: string;
};

export type InboundEmail = {
  messageId: string;
  from: string;
  recipients: string[];
  subject: string;
  text: string;
  html: string;
  headers: EmailHeader[];
  receivedAt: Date;
};
