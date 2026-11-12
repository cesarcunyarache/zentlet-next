import type { CreateNotificationInput, Notification } from './notification.js';

export abstract class NotificationRepository {
  // Returns 'duplicate' when (userId, dedupeKey) already exists — the caller
  // treats this as "already notified", not as an error.
  abstract create(input: CreateNotificationInput): Promise<Notification | 'duplicate'>;
  abstract findLatest(userId: string, limit: number): Promise<Notification[]>;
  abstract countUnread(userId: string): Promise<number>;
  abstract markAllRead(userId: string, readAt: Date): Promise<void>;
}
