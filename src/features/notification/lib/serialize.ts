import type { Notification } from "../server/domain/entities/notification.entity";
import type { TNotification } from "../types";

export function serializeNotification(notification: Notification): TNotification {
  return {
    id: notification.id,
    type: notification.type,
    data: notification.data,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  } as TNotification;
}
