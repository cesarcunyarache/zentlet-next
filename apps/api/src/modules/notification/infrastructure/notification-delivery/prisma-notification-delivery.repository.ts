import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { ClaimedDelivery, DeliveryOutcome } from '../../domain/notification-delivery/notification-delivery.js';
import { NotificationDeliveryRepository } from '../../domain/notification-delivery/notification-delivery.repository.js';
import { toNotification } from '../notification/notification.mapper.js';

const CLAIMED_DELIVERY_SELECT = {
  id: true,
  channel: true,
  attempts: true,
  notification: {
    include: { user: { select: { email: true, name: true } } },
  },
} as const;

@Injectable()
export class PrismaNotificationDeliveryRepository extends NotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createPending(notificationId: string, channels: string[]): Promise<string[]> {
    if (channels.length === 0) return [];

    const created = await this.prisma.$transaction(
      channels.map((channel) =>
        this.prisma.notificationDelivery.create({ data: { notificationId, channel }, select: { id: true } }),
      ),
    );
    return created.map((row) => row.id);
  }

  async claim(id: string, now: Date, leaseUntil: Date): Promise<ClaimedDelivery | null> {
    const { count } = await this.prisma.notificationDelivery.updateMany({
      where: { id, status: 'pending', nextAttemptAt: { lte: now } },
      data: { attempts: { increment: 1 }, nextAttemptAt: leaseUntil },
    });
    if (count === 0) return null;

    const row = await this.prisma.notificationDelivery.findUnique({ where: { id }, select: CLAIMED_DELIVERY_SELECT });
    if (!row) return null;

    const { user, ...notificationRow } = row.notification;
    return {
      id: row.id,
      channel: row.channel,
      attempts: row.attempts,
      notification: toNotification(notificationRow),
      recipient: { email: user.email, name: user.name },
    };
  }

  async saveOutcome(id: string, outcome: DeliveryOutcome): Promise<void> {
    await this.prisma.notificationDelivery.update({ where: { id }, data: outcome });
  }

  async findDueIds(now: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.notificationDelivery.findMany({
      where: { status: 'pending', nextAttemptAt: { lte: now } },
      select: { id: true },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    });
    return rows.map((row) => row.id);
  }
}
