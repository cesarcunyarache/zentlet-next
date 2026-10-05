import type { TInboxItem, TInboxSender } from "../types";

interface InboxItemRow {
  id: string;
  bank: string | null;
  senderAddress: string;
  subject: string;
  isVerified: boolean;
  isNewSender: boolean;
  isLearned: boolean;
  type: string;
  amount: { toNumber(): number } | null;
  currency: string | null;
  merchant: string | null;
  description: string;
  categoryId: string | null;
  transactionDate: Date;
  cardLast4: string | null;
  duplicateOfId: string | null;
  receivedAt: Date;
}

interface InboxSenderRow {
  id: string;
  address: string;
  status: string;
  origin: string;
  acceptedCount: number;
}

export function serializeInboxItem(row: InboxItemRow): TInboxItem {
  return {
    id: row.id,
    bank: row.bank,
    senderAddress: row.senderAddress,
    subject: row.subject,
    isVerified: row.isVerified,
    isNewSender: row.isNewSender,
    isLearned: row.isLearned,
    type: row.type === "income" ? "income" : "expense",
    amount: row.amount ? row.amount.toNumber() : null,
    currency: row.currency,
    merchant: row.merchant,
    description: row.description,
    categoryId: row.categoryId,
    transactionDate: row.transactionDate.toISOString().slice(0, 10),
    cardLast4: row.cardLast4,
    duplicateOfId: row.duplicateOfId,
    receivedAt: row.receivedAt.toISOString(),
  };
}

export function serializeInboxSender(row: InboxSenderRow): TInboxSender {
  return {
    id: row.id,
    address: row.address,
    status: row.status === "blocked" ? "blocked" : "trusted",
    origin: row.origin === "manual" ? "manual" : "learned",
    acceptedCount: row.acceptedCount,
  };
}
