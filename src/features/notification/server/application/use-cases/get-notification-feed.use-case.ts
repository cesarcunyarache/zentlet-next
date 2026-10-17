import type { NotificationFeed } from "../../../types";
import { FEED_SIZE } from "../../domain/entities/notification.entity";
import type { NotificationRepository } from "../../domain/repositories/notification.repository";

export class GetNotificationFeedUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(userId: string): Promise<NotificationFeed> {
    const [items, unreadCount] = await Promise.all([
      this.notificationRepository.findLatest(userId, FEED_SIZE),
      this.notificationRepository.countUnread(userId),
    ]);
    return { items, unreadCount };
  }
}
