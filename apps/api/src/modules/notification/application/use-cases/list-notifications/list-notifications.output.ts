import type { Notification } from '../../../domain/notification/notification.js';

export type ListNotificationsOutput = {
  items: Notification[];
  unreadCount: number;
};
