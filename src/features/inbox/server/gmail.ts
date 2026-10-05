import { randomBytes, timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { isUniqueViolation } from "@/lib/db-errors";
import { logger } from "@/lib/observability/logger";
import { hasFeature } from "@/features/billing/server/access";
import type { GmailConnection } from "@/generated/prisma/client";
import { fromGmailMessage, gmailHeader, isIncomingMessage } from "../lib/gmail-message";
import { normalizeAddress, senderVerdict } from "../lib/sender";
import type { TGmailConnection } from "../types";
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
import { ingestUserEmail, type IngestOutcome } from "./ingest";

export type GmailConnectOutcome = "connected" | "scope_denied" | "taken" | "unavailable";
export type GmailSyncOutcome = "synced" | "reset" | "revoked" | "not_allowed";
type GmailPushOutcome = GmailSyncOutcome | "unauthorized" | "invalid" | "unknown";

export const GMAIL_STATE_COOKIE = "gmail_oauth_state";

const MAX_HISTORY_PAGES = 5;
const MAX_MESSAGES_PER_SYNC = 50;
const WATCHED_VERDICTS = new Set(["known", "trusted"]);

function gmailConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const topic = process.env.GMAIL_PUBSUB_TOPIC?.trim();
  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (!clientId || !clientSecret || !topic || !baseUrl || !isEncryptionConfigured()) return null;
  return { clientId, clientSecret, topic, redirectUri: new URL("/api/inbox/gmail/callback", baseUrl).toString() };
}

export function isGmailAvailable() {
  return gmailConfig() !== null;
}

export async function getGmailConnection(userId: string): Promise<TGmailConnection> {
  const connection = await prisma.gmailConnection.findUnique({ where: { userId } });
  return {
    isAvailable: isGmailAvailable(),
    email: connection?.email ?? null,
    status: connection ? (connection.status === "revoked" ? "revoked" : "active") : null,
    lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
  };
}

export function startGmailConnect() {
  const config = gmailConfig();
  if (!config) return null;
  const state = randomBytes(24).toString("base64url");
  return { state, url: authorizeUrl(config, state) };
}

export function isSameState(expected: string | undefined, given: string | null) {
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function completeGmailConnect(userId: string, code: string): Promise<GmailConnectOutcome> {
  const config = gmailConfig();
  if (!config) return "unavailable";

  const tokens = await exchangeCode(config, code);
  if (!tokens.scope.split(" ").includes(GMAIL_SCOPE) || !tokens.refreshToken) return "scope_denied";

  const email = (await getProfile(tokens.accessToken)).emailAddress.toLowerCase();
  const owner = await prisma.gmailConnection.findUnique({ where: { email }, select: { userId: true } });
  if (owner && owner.userId !== userId) {
    await revokeToken(tokens.refreshToken).catch(() => undefined);
    return "taken";
  }

  const previous = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (previous && previous.email !== email) await disconnectGmail(userId);

  const watch = await watchInbox(tokens.accessToken, config.topic);
  const data = {
    email,
    refreshToken: encryptSecret(tokens.refreshToken),
    status: "active",
    historyId: BigInt(watch.historyId),
    watchExpiresAt: new Date(Number(watch.expiration)),
  };
  try {
    await prisma.gmailConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  } catch (error) {
    if (isUniqueViolation(error)) return "taken";
    throw error;
  }
  logger.info({ userId }, "inbox.gmail_connected");
  return "connected";
}

async function accessTokenFor(connection: GmailConnection) {
  const config = gmailConfig();
  if (!config || connection.status !== "active") return null;
  try {
    return await refreshAccessToken(config, decryptSecret(connection.refreshToken));
  } catch (error) {
    if (!(error instanceof GmailApiError) || !error.isRevoked) throw error;
    await prisma.gmailConnection.update({ where: { id: connection.id }, data: { status: "revoked" } });
    logger.warn({ userId: connection.userId }, "inbox.gmail_revoked");
    return null;
  }
}

export async function disconnectGmail(userId: string) {
  const connection = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!connection) return;
  try {
    const accessToken = await accessTokenFor(connection);
    if (accessToken) await stopWatch(accessToken);
    await revokeToken(decryptSecret(connection.refreshToken));
  } catch (error) {
    logger.warn({ userId, err: error }, "inbox.gmail_disconnect_cleanup_failed");
  }
  await prisma.gmailConnection.deleteMany({ where: { id: connection.id } });
}

async function newMessageIds(accessToken: string, startHistoryId: string) {
  const ids = new Set<string>();
  let latest = startHistoryId;
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
    const history = await listHistory(accessToken, startHistoryId, pageToken);
    if (history.historyId) latest = history.historyId;
    for (const entry of history.history ?? []) {
      for (const { message } of entry.messagesAdded ?? []) {
        if (isIncomingMessage(message.labelIds)) ids.add(message.id);
      }
    }
    pageToken = history.nextPageToken;
    if (!pageToken) break;
  }
  return { ids: [...ids].slice(0, MAX_MESSAGES_PER_SYNC), latest };
}

async function ingestMessage(accessToken: string, userId: string, id: string, isWatched: (from: string) => boolean) {
  try {
    const metadata = await getMessageSender(accessToken, id);
    if (!isWatched(normalizeAddress(gmailHeader(metadata, "From")))) return "skipped";
    return await ingestUserEmail(userId, fromGmailMessage(await getMessage(accessToken, id)));
  } catch (error) {
    if (error instanceof GmailApiError && error.status === 404) return "skipped";
    throw error;
  }
}

async function saveProgress(connection: GmailConnection, historyId: string) {
  const next = BigInt(historyId);
  await prisma.gmailConnection.updateMany({
    where: { id: connection.id, OR: [{ historyId: null }, { historyId: { lt: next } }] },
    data: { historyId: next },
  });
  await prisma.gmailConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: new Date() } });
}

export async function syncGmail(connection: GmailConnection): Promise<GmailSyncOutcome> {
  const accessToken = await accessTokenFor(connection);
  if (!accessToken) return "revoked";
  if (!(await hasFeature(connection.userId, "email_import"))) return "not_allowed";

  if (connection.historyId === null) {
    await saveProgress(connection, (await getProfile(accessToken)).historyId);
    return "reset";
  }

  let found: Awaited<ReturnType<typeof newMessageIds>>;
  try {
    found = await newMessageIds(accessToken, connection.historyId.toString());
  } catch (error) {
    if (!(error instanceof GmailApiError) || error.status !== 404) throw error;
    await saveProgress(connection, (await getProfile(accessToken)).historyId);
    return "reset";
  }

  const rules = await prisma.inboxSender.findMany({ where: { userId: connection.userId } });
  const isWatched = (from: string) => Boolean(from) && WATCHED_VERDICTS.has(senderVerdict(from, rules));
  const outcomes: (IngestOutcome | "skipped")[] = [];
  for (const id of found.ids) outcomes.push(await ingestMessage(accessToken, connection.userId, id, isWatched));

  await saveProgress(connection, found.latest);
  logger.info(
    { userId: connection.userId, messages: found.ids.length, created: outcomes.filter((outcome) => outcome === "created").length },
    "inbox.gmail_synced",
  );
  return "synced";
}

function readPushNotification(payload: unknown) {
  const data = (payload as { message?: { data?: unknown } } | null)?.message?.data;
  if (typeof data !== "string") return null;
  try {
    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf8")) as { emailAddress?: unknown };
    return typeof decoded.emailAddress === "string" ? decoded.emailAddress.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function handleGmailPush(req: Request): Promise<GmailPushOutcome> {
  if (!isSameState(process.env.GMAIL_PUSH_SECRET?.trim(), new URL(req.url).searchParams.get("token"))) {
    return "unauthorized";
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return "invalid";
  }
  const email = readPushNotification(payload);
  if (!email) return "invalid";

  const connection = await prisma.gmailConnection.findUnique({ where: { email } });
  if (!connection || connection.status !== "active") return "unknown";
  return syncGmail(connection);
}

export async function renewGmailWatches() {
  const config = gmailConfig();
  if (!config) return { renewed: 0, failed: 0 };

  const connections = await prisma.gmailConnection.findMany({ where: { status: "active" } });
  let renewed = 0;
  let failed = 0;
  for (const connection of connections) {
    try {
      const accessToken = await accessTokenFor(connection);
      if (!accessToken) continue;
      const watch = await watchInbox(accessToken, config.topic);
      await prisma.gmailConnection.update({
        where: { id: connection.id },
        data: { watchExpiresAt: new Date(Number(watch.expiration)) },
      });
      await syncGmail(connection);
      renewed++;
    } catch (error) {
      failed++;
      logger.error({ userId: connection.userId, err: error }, "inbox.gmail_renew_failed");
    }
  }
  return { renewed, failed };
}
