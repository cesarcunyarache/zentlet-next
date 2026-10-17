import type { NotificationChannel, NotificationType, TNotification } from "../../../types";
import type { Recipient } from "../entities/notification.entity";

export interface ChannelFlags {
  isEnabled(userId: string, channel: NotificationChannel): Promise<boolean>;
}

export interface ChannelSender {
  supports(channel: string): channel is NotificationChannel;
  send(channel: NotificationChannel, notification: TNotification, recipient: Recipient): Promise<boolean>;
}

export interface NotificationMonitor {
  created(type: NotificationType, channels: NotificationChannel[]): void;
  sendFailed(error: unknown, channel: NotificationChannel): void;
  deliveryFailed(deliveryId: string, channel: string, attempts: number): void;
}
