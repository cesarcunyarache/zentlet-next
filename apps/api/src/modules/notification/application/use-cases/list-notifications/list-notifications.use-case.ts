import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../../../domain/notification/notification.repository.js';
import type { ListNotificationsInput } from './list-notifications.input.js';
import type { ListNotificationsOutput } from './list-notifications.output.js';

const DEFAULT_LIMIT = 50;

@Injectable()
export class ListNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: ListNotificationsInput): Promise<ListNotificationsOutput> {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const [items, unreadCount] = await Promise.all([
      this.notificationRepository.findLatest(input.userId, limit),
      this.notificationRepository.countUnread(input.userId),
    ]);
    return { items, unreadCount };
  }
}
