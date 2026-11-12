import { Injectable } from '@nestjs/common';
import type { CreateNotificationInput, Notification } from '../../domain/notification/notification.js';
import { NotificationRepository } from '../../domain/notification/notification.repository.js';

@Injectable()
export class InMemoryNotificationRepository extends NotificationRepository {
  private readonly notifications = new Map<string, Notification>();

  async create(input: CreateNotificationInput): Promise<Notification | 'duplicate'> {
    const isDuplicate =
      input.dedupeKey !== null &&
      [...this.notifications.values()].some(
        (notification) => notification.userId === input.userId && notification.dedupeKey === input.dedupeKey,
      );
    if (isDuplicate) return 'duplicate';

    const notification: Notification = {
      id: crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      data: input.data,
      dedupeKey: input.dedupeKey,
      readAt: null,
      createdAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async findLatest(userId: string, limit: number): Promise<Notification[]> {
    return [...this.notifications.values()]
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async countUnread(userId: string): Promise<number> {
    return [...this.notifications.values()].filter(
      (notification) => notification.userId === userId && notification.readAt === null,
    ).length;
  }

  async markAllRead(userId: string, readAt: Date): Promise<void> {
    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId && notification.readAt === null) {
        this.notifications.set(id, { ...notification, readAt });
      }
    }
  }
}
