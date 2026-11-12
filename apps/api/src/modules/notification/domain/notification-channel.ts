import type { NotificationRecipient } from './notification-delivery/notification-delivery.js';
import type { Notification } from './notification/notification.js';

// Strategy: one implementation per transport (email today). Returns false on
// a handled send failure so the caller can schedule a retry; throwing is
// reserved for programmer errors the caller should not retry.
export abstract class NotificationChannel {
  abstract readonly name: string;
  abstract send(notification: Notification, recipient: NotificationRecipient): Promise<boolean>;
}
