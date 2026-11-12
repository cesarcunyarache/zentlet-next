import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../../../domain/notification/notification.repository.js';
import type { MarkNotificationReadInput } from './mark-notification-read.input.js';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: MarkNotificationReadInput): Promise<void> {
    await this.notificationRepository.markAllRead(input.userId, new Date());
  }
}
