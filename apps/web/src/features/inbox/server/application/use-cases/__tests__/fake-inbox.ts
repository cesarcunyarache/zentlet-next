import { vi } from "vitest";
import type { GmailConnection } from "../../../domain/entities/gmail-connection.entity";
import type { InboxItem } from "../../../domain/entities/inbox-item.entity";
import type { InboxSender } from "../../../domain/entities/inbox-sender.entity";
import type { GmailGateway, InboxMonitor } from "../../../domain/ports/inbox.ports";
import type { EmailInboxRepository } from "../../../domain/repositories/email-inbox.repository";
import type { GmailConnectionRepository } from "../../../domain/repositories/gmail-connection.repository";
import type { InboxItemRepository } from "../../../domain/repositories/inbox-item.repository";
import type { InboxSenderRepository } from "../../../domain/repositories/inbox-sender.repository";

export const USER = "user-1";

export const pendingItem: InboxItem = {
  id: "item-1",
  userId: USER,
  status: "pending",
  externalId: "message-1",
  senderAddress: "alerts@shop.pe",
  bank: null,
  subject: "Consumo",
  parser: "generic",
  isVerified: false,
  isNewSender: true,
  type: "expense",
  amount: 14.5,
  currency: "PEN",
  merchant: "IKF A53",
  description: "IKF A53",
  categoryId: null,
  isLearned: false,
  transactionDate: new Date("2026-09-24"),
  cardLast4: null,
  reference: "576278",
  duplicateOfId: null,
  transactionId: null,
  resolvedAt: null,
  receivedAt: new Date("2026-09-25T04:55:00.000Z"),
  createdAt: new Date("2026-09-25T04:55:00.000Z"),
};

export const sender = (overrides: Partial<InboxSender> = {}): InboxSender => ({
  id: "sender-1",
  userId: USER,
  address: "alerts@shop.pe",
  status: "trusted",
  origin: "learned",
  acceptedCount: 0,
  dismissedCount: 1,
  createdAt: new Date(),
  ...overrides,
});

export const gmailConnection = (overrides: Partial<GmailConnection> = {}): GmailConnection => ({
  id: "gmail-1",
  userId: USER,
  email: "cesar@gmail.com",
  sealedRefreshToken: "sealed-refresh",
  status: "active",
  historyId: BigInt(1000),
  watchExpiresAt: null,
  lastSyncedAt: null,
  ...overrides,
});

export function fakeItemRepository(overrides: Partial<InboxItemRepository> = {}): InboxItemRepository {
  return {
    findPending: vi.fn().mockResolvedValue([]),
    findPendingOwned: vi.fn().mockResolvedValue(pendingItem),
    hasReference: vi.fn().mockResolvedValue(false),
    insert: vi.fn().mockResolvedValue("created"),
    accept: vi.fn(),
    markDismissed: vi.fn(),
    categoryBelongsTo: vi.fn().mockResolvedValue(true),
    findMatchableCategories: vi.fn().mockResolvedValue([]),
    findSimilarTransactionId: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

export function fakeSenderRepository(overrides: Partial<InboxSenderRepository> = {}): InboxSenderRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findRules: vi.fn().mockResolvedValue([]),
    trust: vi.fn(),
    recordDismissal: vi.fn().mockResolvedValue(sender()),
    block: vi.fn(),
    deleteOwned: vi.fn().mockResolvedValue("deleted"),
    ...overrides,
  };
}

export function fakeEmailInboxRepository(overrides: Partial<EmailInboxRepository> = {}): EmailInboxRepository {
  return {
    findByUser: vi.fn().mockResolvedValue(null),
    findByAddresses: vi.fn().mockResolvedValue(null),
    insert: vi.fn(async (userId: string, address: string) => ({
      id: "inbox-1",
      userId,
      address,
      verificationCode: null,
      verificationUrl: null,
      lastReceivedAt: null,
    })),
    recordReceipt: vi.fn(),
    ...overrides,
  };
}

export function fakeGmailRepository(overrides: Partial<GmailConnectionRepository> = {}): GmailConnectionRepository {
  return {
    findByUser: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    findActive: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue("saved"),
    markRevoked: vi.fn(),
    saveProgress: vi.fn(),
    updateWatchExpiry: vi.fn(),
    deleteById: vi.fn(),
    ...overrides,
  };
}

export function fakeGmailGateway(overrides: Partial<GmailGateway> = {}): GmailGateway {
  return {
    isAvailable: vi.fn().mockReturnValue(true),
    authorizeUrl: vi.fn((state: string) => `https://accounts.google.com?state=${state}`),
    exchangeCode: vi.fn().mockResolvedValue({ accessToken: "access-1", refreshToken: "refresh-1", canReadInbox: true }),
    refreshAccessToken: vi.fn().mockResolvedValue("access-2"),
    revokeToken: vi.fn(),
    getProfile: vi.fn().mockResolvedValue({ emailAddress: "Cesar@Gmail.com", historyId: "900" }),
    watch: vi.fn().mockResolvedValue({ historyId: BigInt(1000), watchExpiresAt: new Date("2026-10-23") }),
    stopWatch: vi.fn(),
    listHistory: vi.fn().mockResolvedValue({ historyId: "1100", history: [] }),
    getMessageSender: vi.fn().mockResolvedValue(null),
    getMessage: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

export const fakeMonitor = (): InboxMonitor => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

export const fakeCipher = { seal: (plain: string) => `sealed:${plain}`, open: (sealed: string) => `open:${sealed}` };
