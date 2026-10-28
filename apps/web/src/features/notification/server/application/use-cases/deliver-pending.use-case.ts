import { PENDING_BATCH } from "../../domain/entities/notification.entity";
import type { DeliveryRepository } from "../../domain/repositories/delivery.repository";
import type { DeliverNotificationUseCase } from "./deliver-notification.use-case";

export class DeliverPendingUseCase {
  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly deliverNotification: DeliverNotificationUseCase,
  ) {}

  async execute() {
    const dueIds = await this.deliveryRepository.findDueIds(new Date(), PENDING_BATCH);

    for (const id of dueIds) {
      await this.deliverNotification.execute(id);
    }

    return { processed: dueIds.length };
  }
}
