import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { SubscriptionLifecycle } from "../services/subscription-lifecycle.service";

export class SyncUserSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycle,
  ) {}

  async execute(userId: string) {
    const live = await this.subscriptionRepository.findLive(userId);
    if (!live) return;

    await this.subscriptionLifecycle.sync(live);
  }
}
