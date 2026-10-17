import { CLAIM_LEASE_MS, hasAttemptsLeft, nextAttemptAt } from "../../../lib/retry";
import type { ClaimedDelivery, DeliveryOutcome } from "../../domain/entities/notification.entity";
import type { ChannelSender, NotificationMonitor } from "../../domain/ports/notification.ports";
import type { DeliveryRepository } from "../../domain/repositories/delivery.repository";

function deliveryOutcome(isSent: boolean, attempts: number, now: Date): DeliveryOutcome {
  if (isSent) return { status: "sent", sentAt: now };
  if (hasAttemptsLeft(attempts)) return { nextAttemptAt: nextAttemptAt(attempts, now) };
  return { status: "failed" };
}

export class DeliverNotificationUseCase {
  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly channelSender: ChannelSender,
    private readonly notificationMonitor: NotificationMonitor,
  ) {}

  async execute(deliveryId: string) {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS);

    const delivery = await this.deliveryRepository.claim(deliveryId, now, leaseUntil);
    const claimedByAnotherWorker = delivery === null;
    if (claimedByAnotherWorker) return;

    const isSent = await this.send(delivery);
    const outcome = deliveryOutcome(isSent, delivery.attempts, now);
    await this.deliveryRepository.saveOutcome(deliveryId, outcome);

    if (!isSent) this.notificationMonitor.deliveryFailed(deliveryId, delivery.channel, delivery.attempts);
  }

  private async send({ channel, notification, recipient }: ClaimedDelivery) {
    if (!this.channelSender.supports(channel)) return false;

    try {
      return await this.channelSender.send(channel, notification, recipient);
    } catch (error) {
      this.notificationMonitor.sendFailed(error, channel);
      return false;
    }
  }
}
