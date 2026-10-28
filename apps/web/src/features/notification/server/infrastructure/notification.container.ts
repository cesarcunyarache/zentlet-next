import { DeliverNotificationUseCase } from "../application/use-cases/deliver-notification.use-case";
import { DeliverPendingUseCase } from "../application/use-cases/deliver-pending.use-case";
import { GetNotificationFeedUseCase } from "../application/use-cases/get-notification-feed.use-case";
import { MarkNotificationsReadUseCase } from "../application/use-cases/mark-notifications-read.use-case";
import { NotifyUseCase } from "../application/use-cases/notify.use-case";
import { channelFlags, channelSender, notificationMonitor } from "./notification.adapters";
import { PrismaDeliveryRepository } from "./persistence/prisma/prisma-delivery.repository";
import { PrismaNotificationRepository } from "./persistence/prisma/prisma-notification.repository";

const notifications = new PrismaNotificationRepository();
const deliveries = new PrismaDeliveryRepository();
const deliver = new DeliverNotificationUseCase(deliveries, channelSender, notificationMonitor);

export const notificationUseCases = {
  notify: new NotifyUseCase(notifications, channelFlags, deliver, notificationMonitor),
  deliver,
  deliverPending: new DeliverPendingUseCase(deliveries, deliver),
  getFeed: new GetNotificationFeedUseCase(notifications),
  markAllRead: new MarkNotificationsReadUseCase(notifications),
};
