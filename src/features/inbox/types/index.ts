import type { TransactionType } from "@/features/transaction/types";

export interface EmailHeader {
  name: string;
  value: string;
}

export interface InboundEmail {
  messageId: string;
  from: string;
  recipients: string[];
  subject: string;
  text: string;
  html: string;
  headers: EmailHeader[];
  receivedAt: Date;
}

export interface EmailMovement {
  type: TransactionType;
  amount: number;
  currency: string | null;
  merchant: string | null;
  description: string;
  transactionDate: string | null;
  cardLast4: string | null;
  reference: string | null;
}

export type SenderStatus = "trusted" | "blocked";
export type SenderOrigin = "manual" | "learned";
export type SenderVerdict = "known" | "trusted" | "blocked" | "unknown";

export interface SenderRule {
  address: string;
  status: string;
  origin: string;
  acceptedCount: number;
  dismissedCount: number;
}

export type InboxStatus = "pending" | "accepted" | "dismissed";

export interface TInboxItem {
  id: string;
  bank: string | null;
  senderAddress: string;
  subject: string;
  isVerified: boolean;
  isNewSender: boolean;
  isLearned: boolean;
  type: TransactionType;
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  description: string;
  categoryId: string | null;
  transactionDate: string;
  cardLast4: string | null;
  duplicateOfId: string | null;
  receivedAt: string;
}

export interface TInboxSender {
  id: string;
  address: string;
  status: SenderStatus;
  origin: SenderOrigin;
  acceptedCount: number;
}

export interface TInboxConnection {
  isAvailable: boolean;
  address: string | null;
  verificationCode: string | null;
  verificationUrl: string | null;
  lastReceivedAt: string | null;
  senders: TInboxSender[];
}
