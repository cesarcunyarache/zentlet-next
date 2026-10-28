import type { TransactionType } from "@/features/transaction/types";

export interface InboxItem {
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
}

export type NewInboxItem = Omit<
  InboxItem,
  "id" | "status" | "transactionId" | "resolvedAt" | "createdAt" | "type" | "amount"
> & {
  type: TransactionType;
  amount: number;
};

export interface AcceptedTransaction {
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  transactionDate: Date;
  reference: string | null;
  listId: string;
}

export interface InboxItemAcceptance {
  item: InboxItem;
  transaction: AcceptedTransaction;
  merchantKey: string | null;
}

export interface MatchableCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DateWindow {
  from: Date;
  to: Date;
}
