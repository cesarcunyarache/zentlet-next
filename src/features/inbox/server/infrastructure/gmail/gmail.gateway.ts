import { isEncryptionConfigured } from "@/lib/crypto";
import type { GmailGateway } from "../../domain/ports/inbox.ports";
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
} from "./gmail-api";

const CALLBACK_PATH = "/api/inbox/gmail/callback";

function gmailConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const topic = process.env.GMAIL_PUBSUB_TOPIC?.trim();
  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (!clientId || !clientSecret || !topic || !baseUrl || !isEncryptionConfigured()) return null;
  return { clientId, clientSecret, topic, redirectUri: new URL(CALLBACK_PATH, baseUrl).toString() };
}

function requireConfig() {
  const config = gmailConfig();
  if (!config) throw new Error("Gmail is not configured");
  return config;
}

const isNotFound = (error: unknown) => error instanceof GmailApiError && error.status === 404;

async function nullWhenNotFound<T>(request: Promise<T>) {
  try {
    return await request;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export const gmailGateway: GmailGateway = {
  isAvailable() {
    return gmailConfig() !== null;
  },

  authorizeUrl(state: string) {
    return authorizeUrl(requireConfig(), state);
  },

  async exchangeCode(code: string) {
    const tokens = await exchangeCode(requireConfig(), code);
    const grantedScopes = tokens.scope.split(" ");
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      canReadInbox: grantedScopes.includes(GMAIL_SCOPE),
    };
  },

  async refreshAccessToken(refreshToken: string) {
    try {
      return await refreshAccessToken(requireConfig(), refreshToken);
    } catch (error) {
      const isRevoked = error instanceof GmailApiError && error.isRevoked;
      if (isRevoked) return "revoked";
      throw error;
    }
  },

  revokeToken,

  getProfile,

  async watch(accessToken: string) {
    const watch = await watchInbox(accessToken, requireConfig().topic);
    return { historyId: BigInt(watch.historyId), watchExpiresAt: new Date(Number(watch.expiration)) };
  },

  stopWatch,

  async listHistory(accessToken: string, startHistoryId: string, pageToken?: string) {
    const page = await nullWhenNotFound(listHistory(accessToken, startHistoryId, pageToken));
    if (!page) return "expired";
    return page;
  },

  getMessageSender(accessToken: string, id: string) {
    return nullWhenNotFound(getMessageSender(accessToken, id));
  },

  getMessage(accessToken: string, id: string) {
    return nullWhenNotFound(getMessage(accessToken, id));
  },
};
