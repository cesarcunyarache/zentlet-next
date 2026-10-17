import { CHANNELS_BY_TYPE } from "../../../lib/channels";
import type { NotificationChannel, NotificationInput } from "../../../types";
import type { ChannelFlags, NotificationMonitor } from "../../domain/ports/notification.ports";
import type { NotificationRepository } from "../../domain/repositories/notification.repository";
import type { DeliverNotificationUseCase } from "./deliver-notification.use-case";

export class NotifyUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly channelFlags: ChannelFlags,
    private readonly deliverNotification: DeliverNotificationUseCase,
    private readonly notificationMonitor: NotificationMonitor,
  ) {}

  async execute(input: NotificationInput) {
    const channels = await this.enabledChannels(input.userId, CHANNELS_BY_TYPE[input.type]);

    const deliveryIds = await this.notificationRepository.createWithDeliveries(input, channels);
    const alreadyNotified = deliveryIds === "duplicate";
    if (alreadyNotified) return;

    this.notificationMonitor.created(input.type, channels);
    await Promise.all(deliveryIds.map((id) => this.deliverNotification.execute(id)));
  }

  private async enabledChannels(userId: string, candidates: NotificationChannel[]) {
    const isEnabled = await Promise.all(candidates.map((channel) => this.channelFlags.isEnabled(userId, channel)));
    return candidates.filter((_, index) => isEnabled[index]);
  }
}
