import { CHECKOUT_REUSE_MS } from "../../../lib/lifecycle";
import type { Subscription } from "../../domain/entities/subscription.entity";
import type { BillingMonitor } from "../../domain/ports/billing.ports";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { SubscriptionLifecycle } from "../services/subscription-lifecycle.service";

const BATCH_SIZE = 100;
const PENDING_SYNC_AFTER_MS = 60 * 60 * 1000;
const PENDING_ABANDON_AFTER_MS = 7 * CHECKOUT_REUSE_MS;

export interface ReconcileResult {
  synced: number;
  abandoned: number;
  failed: number;
}

function isAbandoned(subscription: Subscription, now: Date) {
  const age = now.getTime() - subscription.createdAt.getTime();
  return subscription.status === "pending" && age > PENDING_ABANDON_AFTER_MS;
}

export class ReconcileSubscriptionsUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycle,
    private readonly billingMonitor: BillingMonitor,
  ) {}

  async execute(now = new Date()): Promise<ReconcileResult> {
    const due = await this.subscriptionRepository.findDue({
      pendingCreatedBefore: new Date(now.getTime() - PENDING_SYNC_AFTER_MS),
      periodEndedBefore: now,
      limit: BATCH_SIZE,
    });

    const result: ReconcileResult = { synced: 0, abandoned: 0, failed: 0 };
    for (const subscription of due) {
      try {
        const synced = await this.subscriptionLifecycle.sync(subscription);
        if (isAbandoned(synced, now)) {
          await this.subscriptionLifecycle.cancel(synced, { source: "system", now });
          result.abandoned += 1;
        } else {
          result.synced += 1;
        }
      } catch (error) {
        result.failed += 1;
        this.billingMonitor.failed(error, "billing.reconcile_failed", { subscriptionId: subscription.id });
      }
    }

    return result;
  }
}
