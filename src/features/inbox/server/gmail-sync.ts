import prisma from "@/lib/prisma";
import { safeEqual } from "@/lib/crypto";
import { logger } from "@/lib/observability/logger";
import { hasFeature } from "@/features/billing/server/access";
import type { GmailConnection } from "@/generated/prisma/client";
import { fromGmailMessage, gmailHeader, isIncomingMessage } from "../lib/gmail-message";
import { readPushEmailAddress } from "../lib/gmail-push";
import { normalizeAddress, senderVerdict } from "../lib/sender";
import type { SenderVerdict } from "../types";
import { getMessage, getMessageSender, getProfile, GmailApiError, listHistory } from "./gmail-api";
import { getAccessToken, gmailConfig, startWatch } from "./gmail-client";
import { ingestUserEmail } from "./ingest";

type GmailSyncOutcome = "synced" | "reset" | "revoked" | "not_allowed";
type GmailPushOutcome = GmailSyncOutcome | "unauthorized" | "invalid" | "unknown";

interface SyncContext {
  accessToken: string;
  userId: string;
  isWatched: (from: string) => boolean;
}

const MAX_HISTORY_PAGES = 5;
const MAX_MESSAGES_PER_SYNC = 50;
const WATCHED_VERDICTS = new Set<SenderVerdict>(["known", "trusted"]);

const isNotFound = (error: unknown) => error instanceof GmailApiError && error.status === 404;

async function saveProgress(connectionId: string, historyId: string) {
  const next = BigInt(historyId);
  await Promise.all([
    prisma.gmailConnection.updateMany({
      where: { id: connectionId, OR: [{ historyId: null }, { historyId: { lt: next } }] },
      data: { historyId: next },
    }),
    prisma.gmailConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: new Date() } }),
  ]);
}

async function resetHistory(connectionId: string, accessToken: string) {
  await saveProgress(connectionId, (await getProfile(accessToken)).historyId);
  return "reset" as const;
}

async function collectNewMessageIds(accessToken: string, startHistoryId: string) {
  const ids = new Set<string>();
  let latestHistoryId = startHistoryId;
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
    const history = await listHistory(accessToken, startHistoryId, pageToken);
    latestHistoryId = history.historyId ?? latestHistoryId;
    const added = (history.history ?? []).flatMap((entry) => entry.messagesAdded ?? []);
    added.filter(({ message }) => isIncomingMessage(message.labelIds)).forEach(({ message }) => ids.add(message.id));
    pageToken = history.nextPageToken;
    if (!pageToken) break;
  }
  return { ids: [...ids].slice(0, MAX_MESSAGES_PER_SYNC), latestHistoryId };
}

async function findNewMessages(accessToken: string, startHistoryId: string) {
  try {
    return await collectNewMessageIds(accessToken, startHistoryId);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function watchedSenderFilter(userId: string) {
  const rules = await prisma.inboxSender.findMany({ where: { userId } });
  return (from: string) => Boolean(from) && WATCHED_VERDICTS.has(senderVerdict(from, rules));
}

async function ingestMessage({ accessToken, userId, isWatched }: SyncContext, id: string) {
  try {
    const metadata = await getMessageSender(accessToken, id);
    if (!isWatched(normalizeAddress(gmailHeader(metadata, "From")))) return "skipped";
    return await ingestUserEmail(userId, fromGmailMessage(await getMessage(accessToken, id)));
  } catch (error) {
    if (isNotFound(error)) return "skipped";
    throw error;
  }
}

async function syncWithAccessToken(connection: GmailConnection, accessToken: string): Promise<GmailSyncOutcome> {
  const { id, userId, historyId } = connection;
  if (!(await hasFeature(userId, "email_import"))) return "not_allowed";
  if (historyId === null) return resetHistory(id, accessToken);

  const found = await findNewMessages(accessToken, historyId.toString());
  if (!found) return resetHistory(id, accessToken);

  const context: SyncContext = { accessToken, userId, isWatched: await watchedSenderFilter(userId) };
  let created = 0;
  for (const messageId of found.ids) {
    if ((await ingestMessage(context, messageId)) === "created") created++;
  }

  await saveProgress(id, found.latestHistoryId);
  logger.info({ userId, messages: found.ids.length, created }, "inbox.gmail_synced");
  return "synced";
}

export async function syncGmail(connection: GmailConnection): Promise<GmailSyncOutcome> {
  const accessToken = await getAccessToken(connection);
  return accessToken ? syncWithAccessToken(connection, accessToken) : "revoked";
}

export async function handleGmailPush(req: Request): Promise<GmailPushOutcome> {
  const token = new URL(req.url).searchParams.get("token");
  if (!safeEqual(process.env.GMAIL_PUSH_SECRET?.trim(), token)) return "unauthorized";

  const email = readPushEmailAddress(await req.json().catch(() => null));
  if (!email) return "invalid";

  const connection = await prisma.gmailConnection.findUnique({ where: { email } });
  if (!connection || connection.status !== "active") return "unknown";
  return syncGmail(connection);
}

async function renewWatch(connection: GmailConnection, topic: string) {
  const accessToken = await getAccessToken(connection);
  if (!accessToken) return false;
  const { watchExpiresAt } = await startWatch(accessToken, topic);
  await prisma.gmailConnection.update({ where: { id: connection.id }, data: { watchExpiresAt } });
  await syncWithAccessToken(connection, accessToken);
  return true;
}

export async function renewGmailWatches() {
  const totals = { renewed: 0, failed: 0 };
  const config = gmailConfig();
  if (!config) return totals;

  const connections = await prisma.gmailConnection.findMany({ where: { status: "active" } });
  for (const connection of connections) {
    try {
      if (await renewWatch(connection, config.topic)) totals.renewed++;
    } catch (error) {
      totals.failed++;
      logger.error({ userId: connection.userId, err: error }, "inbox.gmail_renew_failed");
    }
  }
  return totals;
}
