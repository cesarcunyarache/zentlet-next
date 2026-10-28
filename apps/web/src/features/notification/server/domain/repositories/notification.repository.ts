import type { NotificationChannel, NotificationInput, TNotification } from "../../../types";

export interface NotificationRepository {
  createWithDeliveries(input: NotificationInput, channels: NotificationChannel[]): Promise<string[] | "duplicate">;

  findLatest(userId: string, limit: number): Promise<TNotification[]>;

  countUnread(userId: string): Promise<number>;

  markAllRead(userId: string, readAt: Date): Promise<void>;
}
