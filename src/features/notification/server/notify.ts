import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { logger } from "@/lib/observability/logger";
import { isFlagEnabled } from "@/features/feature-flag/server/flags";
import { CHANNELS_BY_TYPE, channelFlag } from "../lib/channels";
import type { NotificationChannel, NotificationInput } from "../types";
import { deliver } from "./deliver";

async function enabledChannels(userId: string, candidates: NotificationChannel[]) {
  const enabled = await Promise.all(candidates.map((channel) => isFlagEnabled(userId, channelFlag(channel))));
  return candidates.filter((_, index) => enabled[index]);
}

async function createNotification({ userId, type, data, dedupeKey }: NotificationInput) {
  const channels = await enabledChannels(userId, CHANNELS_BY_TYPE[type]);
  try {
    const created = await prisma.notification.create({
      data: { userId, type, data, dedupeKey, deliveries: { create: channels.map((channel) => ({ channel })) } },
      select: { deliveries: { select: { id: true } } },
    });
    logger.info({ type, channels }, "notification.created");
    return created.deliveries;
  } catch (error) {
    if (isUniqueViolation(error)) return [];
    throw error;
  }
}

export async function notify(input: NotificationInput) {
  const deliveries = await createNotification(input);
  await Promise.all(deliveries.map(({ id }) => deliver(id)));
}
