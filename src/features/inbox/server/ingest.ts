import prisma from "@/lib/prisma";
import { isoDateIn } from "@/lib/dates";
import { isUniqueViolation } from "@/lib/api/route-helpers";
import { can } from "@/features/billing/lib/entitlements";
import { getEffectivePlan } from "@/features/billing/server/subscriptions";
import { matchCategory } from "@/features/transaction/lib/parse-description";
import type { EmailMovement, InboundEmail, SenderRule } from "../types";
import { knownBankFor } from "../lib/banks";
import { readGmailVerification } from "../lib/gmail";
import { emailBody } from "../lib/html-text";
import { merchantKey } from "../lib/merchant";
import { parseBankEmail } from "../lib/parse-email";
import { normalizeAddress, senderVerdict } from "../lib/sender";
import { isDkimVerified } from "../lib/verification";

export type IngestOutcome =
  | "unknown_recipient"
  | "verification"
  | "not_allowed"
  | "blocked"
  | "ignored"
  | "duplicate"
  | "created";

const DEFAULT_TIME_ZONE = "America/Lima";
const DAY_MS = 86_400_000;
const MAX_SUBJECT_LENGTH = 200;

async function findInbox(recipients: string[]) {
  const addresses = recipients.map(normalizeAddress).filter(Boolean);
  if (!addresses.length) return null;
  return prisma.emailInbox.findFirst({ where: { address: { in: addresses } } });
}

async function fallbackDate(userId: string, receivedAt: Date) {
  const preference = await prisma.userPreference.findUnique({ where: { userId }, select: { timezone: true } });
  return isoDateIn(preference?.timezone ?? DEFAULT_TIME_ZONE, receivedAt);
}

async function resolveCategory(userId: string, movement: EmailMovement) {
  const key = merchantKey(movement.merchant ?? movement.description);
  const rule = key
    ? await prisma.merchantRule.findUnique({ where: { userId_key: { userId, key } }, select: { categoryId: true, description: true } })
    : null;
  if (rule) return { categoryId: rule.categoryId, description: rule.description, isLearned: true };

  const categories = await prisma.category.findMany({ where: { userId }, select: { id: true, name: true, icon: true, color: true } });
  return { categoryId: matchCategory(movement.description, categories), description: movement.description, isLearned: false };
}

async function findDuplicateTransaction(userId: string, movement: EmailMovement, isoDate: string) {
  const day = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  const match = await prisma.transaction.findFirst({
    where: {
      userId,
      type: movement.type,
      amount: movement.amount,
      transactionDate: { gte: new Date(day - DAY_MS), lte: new Date(day + DAY_MS) },
    },
    select: { id: true },
  });
  return match?.id ?? null;
}

async function isRepeatedEmail(userId: string, movement: EmailMovement) {
  if (!movement.reference) return false;
  const existing = await prisma.inboxTransaction.findFirst({
    where: { userId, reference: movement.reference, amount: movement.amount },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function ingestEmail(email: InboundEmail): Promise<IngestOutcome> {
  const inbox = await findInbox(email.recipients);
  if (!inbox) return "unknown_recipient";

  const body = emailBody(email.text, email.html);
  const verification = readGmailVerification(email, body);
  await prisma.emailInbox.update({
    where: { id: inbox.id },
    data: {
      lastReceivedAt: email.receivedAt,
      ...(verification && { verificationCode: verification.code, verificationUrl: verification.url }),
    },
  });
  if (verification) return "verification";

  const { userId } = inbox;
  if (!can(await getEffectivePlan(userId), "email_import")) return "not_allowed";

  const from = normalizeAddress(email.from);
  const rules: SenderRule[] = await prisma.inboxSender.findMany({ where: { userId } });
  const verdict = senderVerdict(from, rules);
  if (!from || verdict === "blocked") return "blocked";

  const movement = parseBankEmail(body, email.subject);
  if (!movement) return "ignored";
  if (await isRepeatedEmail(userId, movement)) return "duplicate";

  const isoDate = movement.transactionDate ?? (await fallbackDate(userId, email.receivedAt));
  const [category, duplicateOfId] = await Promise.all([
    resolveCategory(userId, movement),
    findDuplicateTransaction(userId, movement, isoDate),
  ]);

  try {
    await prisma.inboxTransaction.create({
      data: {
        userId,
        externalId: email.messageId,
        senderAddress: from,
        bank: knownBankFor(from)?.name ?? null,
        subject: email.subject.slice(0, MAX_SUBJECT_LENGTH),
        parser: knownBankFor(from)?.id ?? "generic",
        isVerified: isDkimVerified(email.headers, from),
        isNewSender: verdict === "unknown",
        type: movement.type,
        amount: movement.amount,
        currency: movement.currency,
        merchant: movement.merchant,
        description: category.description,
        categoryId: category.categoryId,
        isLearned: category.isLearned,
        transactionDate: new Date(isoDate),
        cardLast4: movement.cardLast4,
        reference: movement.reference,
        duplicateOfId,
        receivedAt: email.receivedAt,
      },
    });
    return "created";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
}
