import type { NotificationRepository } from "../../domain/repositories/notification.repository";

export class MarkNotificationsReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  execute(userId: string) {
    return this.notificationRepository.markAllRead(userId, new Date());
  }
}
