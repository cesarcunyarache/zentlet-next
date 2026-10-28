import type { BillingEventSource } from "../../../types";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { SubscriptionLifecycle } from "../services/subscription-lifecycle.service";

export class CancelUserSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycle,
  ) {}

  async execute(userId: string, source: BillingEventSource = "user") {
    const live = await this.subscriptionRepository.findLive(userId);
    if (!live) return false;

    await this.subscriptionLifecycle.cancel(live, { source });
    return true;
  }
}
