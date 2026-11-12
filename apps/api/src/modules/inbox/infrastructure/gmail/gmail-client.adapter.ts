import { Injectable } from '@nestjs/common';
import { GmailClient, type GmailGrant, type GmailHistoryPage, type GmailMessage } from '../../domain/gmail-client.js';
import type { GmailWatch } from '../../domain/gmail-connection/gmail-connection.js';
import { TokenCipher } from '../../domain/token-cipher.js';
import {
  authorizeUrl,
  exchangeCode,
  getMessage,
  getMessageSender,
  getProfile,
  GMAIL_SCOPE,
  GmailApiError,
  listHistory,
  refreshAccessToken,
  revokeToken,
  stopWatch,
  watchInbox,
} from './gmail-api.js';

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  topic: string;
  redirectUri: string;
};

const CALLBACK_PATH = '/api/inbox/gmail/callback';
const isNotFound = (error: unknown) => error instanceof GmailApiError && error.status === 404;

async function nullWhenNotFound<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

@Injectable()
export class FetchGmailClient extends GmailClient {
  constructor(private readonly tokenCipher: TokenCipher) {
    super();
  }

  private config(): GmailConfig | null {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const topic = process.env.GMAIL_PUBSUB_TOPIC?.trim();
    const baseUrl = process.env.API_BASE_URL?.trim();
    if (!clientId || !clientSecret || !topic || !baseUrl || !this.tokenCipher.isConfigured()) return null;

    return { clientId, clientSecret, topic, redirectUri: new URL(CALLBACK_PATH, baseUrl).toString() };
  }

  private requireConfig(): GmailConfig {
    const config = this.config();
    if (!config) throw new Error('Gmail is not configured');
    return config;
  }

  isAvailable(): boolean {
    return this.config() !== null;
  }

  authorizeUrl(state: string): string {
    return authorizeUrl(this.requireConfig(), state);
  }

  async exchangeCode(code: string): Promise<GmailGrant> {
    const tokens = await exchangeCode(this.requireConfig(), code);
    const grantedScopes = tokens.scope.split(' ');
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, canReadInbox: grantedScopes.includes(GMAIL_SCOPE) };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | 'revoked'> {
    try {
      const accessToken = await refreshAccessToken(this.requireConfig(), refreshToken);
      return { accessToken };
    } catch (error) {
      if (error instanceof GmailApiError && error.isRevoked) return 'revoked';
      throw error;
    }
  }

  revokeToken(token: string): Promise<void> {
    return revokeToken(token);
  }

  getProfile(accessToken: string): Promise<{ emailAddress: string; historyId: string }> {
    return getProfile(accessToken);
  }

  async watch(accessToken: string): Promise<GmailWatch> {
    const watch = await watchInbox(accessToken, this.requireConfig().topic);
    return { historyId: BigInt(watch.historyId), watchExpiresAt: new Date(Number(watch.expiration)) };
  }

  stopWatch(accessToken: string): Promise<void> {
    return stopWatch(accessToken);
  }

  async listHistory(accessToken: string, startHistoryId: string, pageToken?: string): Promise<GmailHistoryPage | 'expired'> {
    const page = await nullWhenNotFound(listHistory(accessToken, startHistoryId, pageToken));
    return page ?? 'expired';
  }

  getMessageSender(accessToken: string, id: string): Promise<GmailMessage | null> {
    return nullWhenNotFound(getMessageSender(accessToken, id));
  }

  getMessage(accessToken: string, id: string): Promise<GmailMessage | null> {
    return nullWhenNotFound(getMessage(accessToken, id));
  }
}
