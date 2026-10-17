import type {
  EmailInbox as EmailInboxRow,
  GmailConnection as GmailConnectionRow,
  InboxSender as InboxSenderRow,
  InboxTransaction as InboxItemRow,
} from "@/generated/prisma/client";
import type { EmailInbox } from "../../../domain/entities/email-inbox.entity";
import type { GmailConnection } from "../../../domain/entities/gmail-connection.entity";
import type { InboxItem } from "../../../domain/entities/inbox-item.entity";
import type { InboxSender } from "../../../domain/entities/inbox-sender.entity";

export function inboxItemToDomain(row: InboxItemRow): InboxItem {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    externalId: row.externalId,
    senderAddress: row.senderAddress,
    bank: row.bank,
    subject: row.subject,
    parser: row.parser,
    isVerified: row.isVerified,
    isNewSender: row.isNewSender,
    type: row.type,
    amount: row.amount ? row.amount.toNumber() : null,
    currency: row.currency,
    merchant: row.merchant,
    description: row.description,
    categoryId: row.categoryId,
    isLearned: row.isLearned,
    transactionDate: row.transactionDate,
    cardLast4: row.cardLast4,
    reference: row.reference,
    duplicateOfId: row.duplicateOfId,
    transactionId: row.transactionId,
    resolvedAt: row.resolvedAt,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
  };
}

export function inboxSenderToDomain(row: InboxSenderRow): InboxSender {
  return {
    id: row.id,
    userId: row.userId,
    address: row.address,
    status: row.status,
    origin: row.origin,
    acceptedCount: row.acceptedCount,
    dismissedCount: row.dismissedCount,
    createdAt: row.createdAt,
  };
}

export function emailInboxToDomain(row: EmailInboxRow): EmailInbox {
  return {
    id: row.id,
    userId: row.userId,
    address: row.address,
    verificationCode: row.verificationCode,
    verificationUrl: row.verificationUrl,
    lastReceivedAt: row.lastReceivedAt,
  };
}

export function gmailConnectionToDomain(row: GmailConnectionRow): GmailConnection {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    sealedRefreshToken: row.refreshToken,
    status: row.status,
    historyId: row.historyId,
    watchExpiresAt: row.watchExpiresAt,
    lastSyncedAt: row.lastSyncedAt,
  };
}
