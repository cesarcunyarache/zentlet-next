import { Injectable } from '@nestjs/common';
import { NotificationDeliveryRepository } from '../../../domain/notification-delivery/notification-delivery.repository.js';
import { NotificationRepository } from '../../../domain/notification/notification.repository.js';
import type { NotifyInput } from './notify.input.js';
import type { NotifyOutput } from './notify.output.js';

@Injectable()
export class NotifyUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly deliveryRepository: NotificationDeliveryRepository,
  ) {}

  async execute(input: NotifyInput): Promise<NotifyOutput> {
    const notification = await this.notificationRepository.create({
      userId: input.userId,
      type: input.type,
      data: input.data,
      dedupeKey: input.dedupeKey,
    });
    const alreadyNotified = notification === 'duplicate';
    if (alreadyNotified) return { status: 'duplicate' };

    const deliveryIds = await this.deliveryRepository.createPending(notification.id, input.channels);
    return { status: 'created', notificationId: notification.id, deliveryIds };
  }
}
