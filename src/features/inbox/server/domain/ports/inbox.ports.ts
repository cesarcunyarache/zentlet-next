import type { GmailMessage } from "../../../lib/gmail-message";
import type { GmailWatch } from "../entities/gmail-connection.entity";

export interface BudgetMonitor {
  scheduleCheck(userId: string, categoryId: string): void;
}

export interface ListPlacement {
  privateListFor(userId: string): Promise<string>;
}

export interface UserCalendar {
  localDate(userId: string, at: Date): Promise<string>;
}

export interface InboundMailbox {
  domain(): string | null;
}

export interface TokenCipher {
  seal(plain: string): string;
  open(sealed: string): string;
}

export interface InboxMonitor {
  info(event: string, context: Record<string, unknown>): void;
  warn(event: string, context: Record<string, unknown>): void;
  error(event: string, context: Record<string, unknown>): void;
}

export interface GmailGrant {
  accessToken: string;
  refreshToken: string | null;
  canReadInbox: boolean;
}

export interface GmailHistoryPage {
  historyId?: string;
  nextPageToken?: string;
  history?: { messagesAdded?: { message: { id: string; labelIds?: string[] } }[] }[];
}

export interface GmailGateway {
  isAvailable(): boolean;
  authorizeUrl(state: string): string;
  exchangeCode(code: string): Promise<GmailGrant>;
  refreshAccessToken(refreshToken: string): Promise<string | "revoked">;
  revokeToken(token: string): Promise<void>;
  getProfile(accessToken: string): Promise<{ emailAddress: string; historyId: string }>;
  watch(accessToken: string): Promise<GmailWatch>;
  stopWatch(accessToken: string): Promise<void>;
  listHistory(accessToken: string, startHistoryId: string, pageToken?: string): Promise<GmailHistoryPage | "expired">;
  getMessageSender(accessToken: string, id: string): Promise<GmailMessage | null>;
  getMessage(accessToken: string, id: string): Promise<GmailMessage | null>;
}
