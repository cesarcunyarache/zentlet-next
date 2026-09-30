import type { NotificationChannel, NotificationType } from "../types";

export const CHANNELS_BY_TYPE: Record<NotificationType, NotificationChannel[]> = {
  "budget.alert": ["email"],
  "budget.exceeded": ["email"],
};

export const channelFlag = (channel: NotificationChannel) => `notifications-${channel}`;
