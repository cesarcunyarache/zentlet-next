import type { Notification } from '../../domain/notification/notification.js';

export type NotificationRow = {
  id: string;
  userId: string;
  type: string;
  data: unknown;
  dedupeKey: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    data: (row.data ?? {}) as Record<string, unknown>,
    dedupeKey: row.dedupeKey,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}
