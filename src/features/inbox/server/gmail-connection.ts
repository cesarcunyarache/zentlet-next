import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { isUniqueViolation } from "@/lib/db-errors";
import { logger } from "@/lib/observability/logger";
import type { Prisma } from "@/generated/prisma/client";
import type { GmailConnectionStatus, GmailConnectResult, TGmailConnection } from "../types";
import { authorizeUrl, exchangeCode, getProfile, GMAIL_SCOPE, revokeToken, stopWatch } from "./gmail-api";
import { getAccessToken, gmailConfig, isGmailAvailable, startWatch } from "./gmail-client";

const STATE_BYTES = 24;

type ConnectionData = Omit<Prisma.GmailConnectionUncheckedCreateInput, "userId">;

export async function getGmailConnection(userId: string): Promise<TGmailConnection> {
  const connection = await prisma.gmailConnection.findUnique({ where: { userId }, select: { email: true, status: true } });
  return {
    isAvailable: isGmailAvailable(),
    email: connection?.email ?? null,
    status: (connection?.status as GmailConnectionStatus | undefined) ?? null,
  };
}

export function startGmailConnect() {
  const config = gmailConfig();
  if (!config) return null;
  const state = randomBytes(STATE_BYTES).toString("base64url");
  return { state, url: authorizeUrl(config, state) };
}

async function saveConnection(userId: string, data: ConnectionData): Promise<GmailConnectResult> {
  try {
    await prisma.gmailConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  } catch (error) {
    if (isUniqueViolation(error)) return "taken";
    throw error;
  }
  logger.info({ userId }, "inbox.gmail_connected");
  return "connected";
}

export async function completeGmailConnect(userId: string, code: string): Promise<GmailConnectResult> {
  const config = gmailConfig();
  if (!config) return "unavailable";

  const { accessToken, refreshToken, scope } = await exchangeCode(config, code);
  if (!refreshToken || !scope.split(" ").includes(GMAIL_SCOPE)) return "scope_denied";

  const email = (await getProfile(accessToken)).emailAddress.toLowerCase();
  const [owner, previous] = await Promise.all([
    prisma.gmailConnection.findUnique({ where: { email }, select: { userId: true } }),
    prisma.gmailConnection.findUnique({ where: { userId }, select: { email: true } }),
  ]);
  if (owner && owner.userId !== userId) return "taken";
  if (previous && previous.email !== email) await disconnectGmail(userId);

  const watch = await startWatch(accessToken, config.topic);
  return saveConnection(userId, { email, refreshToken: encryptSecret(refreshToken), status: "active", ...watch });
}

export async function disconnectGmail(userId: string) {
  const connection = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!connection) return;
  try {
    const accessToken = await getAccessToken(connection);
    if (accessToken) await stopWatch(accessToken);
    await revokeToken(decryptSecret(connection.refreshToken));
  } catch (error) {
    logger.warn({ userId, err: error }, "inbox.gmail_disconnect_cleanup_failed");
  }
  await prisma.gmailConnection.deleteMany({ where: { id: connection.id } });
}
