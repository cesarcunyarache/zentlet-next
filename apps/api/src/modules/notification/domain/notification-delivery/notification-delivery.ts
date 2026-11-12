import type { Notification } from '../notification/notification.js';

export type DeliveryStatus = 'pending' | 'sent' | 'failed';

export type NotificationDelivery = {
  id: string;
  notificationId: string;
  channel: string;
  status: DeliveryStatus;
  attempts: number;
  nextAttemptAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

export type NotificationRecipient = {
  email: string;
  name: string;
};

// What a channel needs to send one delivery: the notification content and
// who to reach. Fetched together so the channel never re-queries the user.
export type ClaimedDelivery = {
  id: string;
  channel: string;
  attempts: number;
  notification: Notification;
  recipient: NotificationRecipient;
};

export type DeliveryOutcome =
  | { status: 'sent'; sentAt: Date }
  | { status: 'failed' }
  | { nextAttemptAt: Date };
