import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import type { TInboxConnection } from "../types";
import { generateLocalPart, inboxAddress } from "../lib/address";
import { isTrustedRule } from "../lib/sender";
import { serializeInboxSender } from "../lib/serialize";
import { getGmailConnection } from "./gmail";

const MAX_ADDRESS_ATTEMPTS = 3;

export function inboundDomain() {
  return process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() || null;
}

export async function getConnection(userId: string): Promise<TInboxConnection> {
  const [inbox, senders, gmail] = await Promise.all([
    prisma.emailInbox.findUnique({ where: { userId } }),
    prisma.inboxSender.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getGmailConnection(userId),
  ]);
  return {
    isAvailable: inboundDomain() !== null,
    address: inbox?.address ?? null,
    verificationCode: inbox?.verificationCode ?? null,
    verificationUrl: inbox?.verificationUrl ?? null,
    lastReceivedAt: inbox?.lastReceivedAt?.toISOString() ?? null,
    senders: senders.filter((sender) => sender.status === "blocked" || isTrustedRule(sender)).map(serializeInboxSender),
    gmail,
  };
}

export async function createConnection(userId: string, domain: string) {
  const existing = await prisma.emailInbox.findUnique({ where: { userId } });
  if (existing) return existing;
  for (let attempt = 0; attempt < MAX_ADDRESS_ATTEMPTS; attempt++) {
    try {
      return await prisma.emailInbox.create({
        data: { userId, address: inboxAddress(generateLocalPart(randomBytes), domain) },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await prisma.emailInbox.findUnique({ where: { userId } });
      if (raced) return raced;
    }
  }
  throw new Error("Could not allocate an inbox address");
}
