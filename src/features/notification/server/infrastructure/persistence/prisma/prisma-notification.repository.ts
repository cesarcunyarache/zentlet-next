import { isUniqueViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import { NOTIFICATION_FIELDS, serializeNotification } from "../../../../lib/serialize";
import type { NotificationChannel, NotificationInput } from "../../../../types";
import type { NotificationRepository } from "../../../domain/repositories/notification.repository";

export class PrismaNotificationRepository implements NotificationRepository {
  async createWithDeliveries({ userId, type, data, dedupeKey }: NotificationInput, channels: NotificationChannel[]) {
    const deliveries = channels.map((channel) => ({ channel }));

    try {
      const created = await prisma.notification.create({
        data: { userId, type, data, dedupeKey, deliveries: { create: deliveries } },
        select: { deliveries: { select: { id: true } } },
      });
      return created.deliveries.map(({ id }) => id);
    } catch (error) {
      if (isUniqueViolation(error)) return "duplicate" as const;
      throw error;
    }
  }

  async findLatest(userId: string, limit: number) {
    const rows = await prisma.notification.findMany({
      where: { userId },
      select: NOTIFICATION_FIELDS,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(serializeNotification);
  }

  countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markAllRead(userId: string, readAt: Date) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt } });
  }
}
