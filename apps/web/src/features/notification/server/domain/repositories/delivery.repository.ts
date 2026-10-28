import type { ClaimedDelivery, DeliveryOutcome } from "../entities/notification.entity";

export interface DeliveryRepository {
  claim(id: string, now: Date, leaseUntil: Date): Promise<ClaimedDelivery | null>;

  saveOutcome(id: string, outcome: DeliveryOutcome): Promise<void>;

  findDueIds(now: Date, limit: number): Promise<string[]>;
}
