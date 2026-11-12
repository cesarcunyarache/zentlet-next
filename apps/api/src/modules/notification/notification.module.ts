import { Module } from '@nestjs/common';
import { DispatchPendingDeliveriesUseCase } from './application/use-cases/dispatch-pending-deliveries/dispatch-pending-deliveries.use-case.js';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications/list-notifications.use-case.js';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read/mark-notification-read.use-case.js';
import { NotifyUseCase } from './application/use-cases/notify/notify.use-case.js';
import { NotificationChannelRegistry } from './domain/notification-channel-registry.js';
import { NotificationDeliveryRepository } from './domain/notification-delivery/notification-delivery.repository.js';
import { NotificationRepository } from './domain/notification/notification.repository.js';
import { DefaultNotificationChannelRegistry } from './infrastructure/notification-channel/default-notification-channel-registry.js';
import { EmailNotificationChannel } from './infrastructure/notification-channel/email-notification-channel.js';
import { PrismaNotificationDeliveryRepository } from './infrastructure/notification-delivery/prisma-notification-delivery.repository.js';
import { PrismaNotificationRepository } from './infrastructure/notification/prisma-notification.repository.js';

@Module({
  providers: [
    EmailNotificationChannel,
    NotifyUseCase,
    DispatchPendingDeliveriesUseCase,
    MarkNotificationReadUseCase,
    ListNotificationsUseCase,
    { provide: NotificationRepository, useClass: PrismaNotificationRepository },
    { provide: NotificationDeliveryRepository, useClass: PrismaNotificationDeliveryRepository },
    { provide: NotificationChannelRegistry, useClass: DefaultNotificationChannelRegistry },
  ],
  exports: [NotifyUseCase, DispatchPendingDeliveriesUseCase, MarkNotificationReadUseCase, ListNotificationsUseCase],
})
export class NotificationModule {}
