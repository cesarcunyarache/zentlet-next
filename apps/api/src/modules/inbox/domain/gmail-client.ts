import type { GmailWatch } from './gmail-connection/gmail-connection.js';

export type GmailGrant = {
  accessToken: string;
  refreshToken: string | null;
  canReadInbox: boolean;
};

export type GmailHistoryMessage = {
  id: string;
  labelIds?: string[];
};

export type GmailHistoryPage = {
  historyId?: string;
  nextPageToken?: string;
  history?: { messagesAdded?: { message: GmailHistoryMessage }[] }[];
};

export type GmailMessagePart = {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
};

export type GmailMessage = {
  id: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailMessagePart;
};

// Fetch-based port over the Gmail REST API, same philosophy as this codebase's
// MercadoPagoProvider: no googleapis/google-auth-library dependency.
export abstract class GmailClient {
  abstract isAvailable(): boolean;
  abstract authorizeUrl(state: string): string;
  abstract exchangeCode(code: string): Promise<GmailGrant>;
  abstract refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | 'revoked'>;
  abstract revokeToken(token: string): Promise<void>;
  abstract getProfile(accessToken: string): Promise<{ emailAddress: string; historyId: string }>;
  abstract watch(accessToken: string): Promise<GmailWatch>;
  abstract stopWatch(accessToken: string): Promise<void>;
  abstract listHistory(accessToken: string, startHistoryId: string, pageToken?: string): Promise<GmailHistoryPage | 'expired'>;
  abstract getMessageSender(accessToken: string, id: string): Promise<GmailMessage | null>;
  abstract getMessage(accessToken: string, id: string): Promise<GmailMessage | null>;
}
