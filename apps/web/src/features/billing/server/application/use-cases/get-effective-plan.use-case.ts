import { effectivePlan } from "../../../lib/entitlements";
import type { PlanKey } from "../../../lib/plans";
import { SUBSCRIPTION_HISTORY_LIMIT } from "../../domain/entities/subscription.entity";
import type { PlanCache, TestGrant } from "../../domain/ports/billing.ports";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";

export function withTestGrant(testGrant: TestGrant, plan: PlanKey): PlanKey {
  if (testGrant.isEnabled()) return "pro";
  return plan;
}

export class GetEffectivePlanUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planCache: PlanCache,
    private readonly testGrant: TestGrant,
  ) {}

  execute(userId: string) {
    return this.planCache.get(userId, async () => {
      const history = await this.subscriptionRepository.findHistory(userId, SUBSCRIPTION_HISTORY_LIMIT);
      return withTestGrant(this.testGrant, effectivePlan(history, new Date()));
    });
  }
}
