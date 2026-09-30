import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import { preferencesSchema } from "@/features/preference/schemas/preference.schema";
import { CLAIM_LEASE_MS, hasAttemptsLeft, nextAttemptAt } from "../lib/retry";
import { NOTIFICATION_FIELDS, serializeNotification } from "../lib/serialize";
import { channels, isChannel } from "./channels";

const PENDING_BATCH = 50;

const DELIVERY_SELECT = {
  channel: true,
  attempts: true,
  notification: {
    select: {
      ...NOTIFICATION_FIELDS,
      user: { select: { email: true, name: true, preference: { select: { language: true } } } },
    },
  },
} as const;

type ClaimedDelivery = NonNullable<Awaited<ReturnType<typeof claim>>>;

async function claim(deliveryId: string, now: Date) {
  const { count } = await prisma.notificationDelivery.updateMany({
    where: { id: deliveryId, status: "pending", nextAttemptAt: { lte: now } },
    data: { attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + CLAIM_LEASE_MS) },
  });
  if (count === 0) return null;
  return prisma.notificationDelivery.findUnique({ where: { id: deliveryId }, select: DELIVERY_SELECT });
}

async function send({ channel, notification }: ClaimedDelivery) {
  if (!isChannel(channel)) return false;
  const { user, ...row } = notification;
  const locale = preferencesSchema.shape.language.parse(user.preference?.language);
  try {
    return await channels[channel].send(serializeNotification(row), { email: user.email, name: user.name, locale });
  } catch (error) {
    reportError(error, "notification.send_failed", { channel });
    return false;
  }
}

function outcome(isSent: boolean, attempts: number, now: Date) {
  if (isSent) return { status: "sent", sentAt: now };
  return hasAttemptsLeft(attempts) ? { nextAttemptAt: nextAttemptAt(attempts, now) } : { status: "failed" };
}

export async function deliver(deliveryId: string) {
  const now = new Date();
  const delivery = await claim(deliveryId, now);
  if (!delivery) return;

  const isSent = await send(delivery);
  await prisma.notificationDelivery.update({ where: { id: deliveryId }, data: outcome(isSent, delivery.attempts, now) });
  if (!isSent) logger.warn({ deliveryId, channel: delivery.channel, attempts: delivery.attempts }, "notification.delivery_failed");
}

export async function deliverPending() {
  const due = await prisma.notificationDelivery.findMany({
    where: { status: "pending", nextAttemptAt: { lte: new Date() } },
    select: { id: true },
    orderBy: { nextAttemptAt: "asc" },
    take: PENDING_BATCH,
  });
  for (const { id } of due) await deliver(id);
  return { processed: due.length };
}
