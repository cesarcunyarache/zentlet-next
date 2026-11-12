import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { CreateNotificationInput, Notification } from '../../domain/notification/notification.js';
import { NotificationRepository } from '../../domain/notification/notification.repository.js';
import { isUniqueViolation } from './db-errors.js';
import { toNotification } from './notification.mapper.js';

@Injectable()
export class PrismaNotificationRepository extends NotificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateNotificationInput): Promise<Notification | 'duplicate'> {
    try {
      const row = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          data: input.data as Prisma.InputJsonValue,
          dedupeKey: input.dedupeKey,
        },
      });
      return toNotification(row);
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  async findLatest(userId: string, limit: number): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toNotification);
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markAllRead(userId: string, readAt: Date): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt } });
  }
}
