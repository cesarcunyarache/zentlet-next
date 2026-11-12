import type { ClaimedDelivery, DeliveryOutcome } from './notification-delivery.js';

export abstract class NotificationDeliveryRepository {
  abstract createPending(notificationId: string, channels: string[]): Promise<string[]>;

  // Atomically claims one pending, due delivery: increments attempts and
  // extends nextAttemptAt to the lease so a concurrent worker skips it.
  // Returns null when another worker already claimed it first.
  abstract claim(id: string, now: Date, leaseUntil: Date): Promise<ClaimedDelivery | null>;

  abstract saveOutcome(id: string, outcome: DeliveryOutcome): Promise<void>;
  abstract findDueIds(now: Date, limit: number): Promise<string[]>;
}
