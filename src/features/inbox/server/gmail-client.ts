import prisma from "@/lib/prisma";
import { decryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { logger } from "@/lib/observability/logger";
import type { GmailConnection } from "@/generated/prisma/client";
import { GmailApiError, refreshAccessToken, watchInbox } from "./gmail-api";

const CALLBACK_PATH = "/api/inbox/gmail/callback";

export function gmailConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const topic = process.env.GMAIL_PUBSUB_TOPIC?.trim();
  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (!clientId || !clientSecret || !topic || !baseUrl || !isEncryptionConfigured()) return null;
  return { clientId, clientSecret, topic, redirectUri: new URL(CALLBACK_PATH, baseUrl).toString() };
}

export function isGmailAvailable() {
  return gmailConfig() !== null;
}

async function markRevoked(connection: GmailConnection) {
  await prisma.gmailConnection.update({ where: { id: connection.id }, data: { status: "revoked" } });
  logger.warn({ userId: connection.userId }, "inbox.gmail_revoked");
}

export async function getAccessToken(connection: GmailConnection) {
  const config = gmailConfig();
  if (!config || connection.status !== "active") return null;
  try {
    return await refreshAccessToken(config, decryptSecret(connection.refreshToken));
  } catch (error) {
    if (!(error instanceof GmailApiError) || !error.isRevoked) throw error;
    await markRevoked(connection);
    return null;
  }
}

export async function startWatch(accessToken: string, topic: string) {
  const watch = await watchInbox(accessToken, topic);
  return { historyId: BigInt(watch.historyId), watchExpiresAt: new Date(Number(watch.expiration)) };
}
