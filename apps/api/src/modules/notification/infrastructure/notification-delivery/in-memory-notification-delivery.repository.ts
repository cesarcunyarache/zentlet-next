import { Injectable } from '@nestjs/common';
import type {
  ClaimedDelivery,
  DeliveryOutcome,
  NotificationDelivery,
  NotificationRecipient,
} from '../../domain/notification-delivery/notification-delivery.js';
import { NotificationDeliveryRepository } from '../../domain/notification-delivery/notification-delivery.repository.js';
import type { Notification } from '../../domain/notification/notification.js';

const DEFAULT_RECIPIENT: NotificationRecipient = { email: 'user@example.com', name: 'Test User' };

@Injectable()
export class InMemoryNotificationDeliveryRepository extends NotificationDeliveryRepository {
  private readonly deliveries = new Map<string, NotificationDelivery>();
  private readonly notifications = new Map<string, Notification>();
  private readonly recipients = new Map<string, NotificationRecipient>();

  // Test seam: this fake has no join to a notification/user table, so tests
  // register the notification (and, optionally, its recipient) a delivery resolves to.
  registerNotification(notification: Notification, recipient: NotificationRecipient = DEFAULT_RECIPIENT): void {
    this.notifications.set(notification.id, notification);
    this.recipients.set(notification.id, recipient);
  }

  async createPending(notificationId: string, channels: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const channel of channels) {
      const delivery: NotificationDelivery = {
        id: crypto.randomUUID(),
        notificationId,
        channel,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
        sentAt: null,
        createdAt: new Date(),
      };
      this.deliveries.set(delivery.id, delivery);
      ids.push(delivery.id);
    }
    return ids;
  }

  async claim(id: string, now: Date, leaseUntil: Date): Promise<ClaimedDelivery | null> {
    const delivery = this.deliveries.get(id);
    if (!delivery || delivery.status !== 'pending' || delivery.nextAttemptAt > now) return null;

    const attempts = delivery.attempts + 1;
    this.deliveries.set(id, { ...delivery, attempts, nextAttemptAt: leaseUntil });

    const notification = this.notifications.get(delivery.notificationId);
    const recipient = this.recipients.get(delivery.notificationId) ?? DEFAULT_RECIPIENT;
    if (!notification) return null;

    return { id: delivery.id, channel: delivery.channel, attempts, notification, recipient };
  }

  async saveOutcome(id: string, outcome: DeliveryOutcome): Promise<void> {
    const delivery = this.deliveries.get(id);
    if (!delivery) return;
    this.deliveries.set(id, { ...delivery, ...outcome });
  }

  async findDueIds(now: Date, limit: number): Promise<string[]> {
    return [...this.deliveries.values()]
      .filter((delivery) => delivery.status === 'pending' && delivery.nextAttemptAt <= now)
      .sort((a, b) => a.nextAttemptAt.getTime() - b.nextAttemptAt.getTime())
      .slice(0, limit)
      .map((delivery) => delivery.id);
  }
}
