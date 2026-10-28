import { effectivePlan } from "../../../lib/entitlements";
import { isTrialEligible } from "../../../lib/lifecycle";
import { PAID_PLAN_KEYS, planFeatures, planPrice } from "../../../lib/plans";
import type { BillingSummary } from "../../../types";
import { SUBSCRIPTION_HISTORY_LIMIT } from "../../domain/entities/subscription.entity";
import type { TestGrant } from "../../domain/ports/billing.ports";
import type { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import { withTestGrant } from "./get-effective-plan.use-case";

export class GetBillingSummaryUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly testGrant: TestGrant,
  ) {}

  async execute(userId: string, now = new Date()): Promise<BillingSummary> {
    const history = await this.subscriptionRepository.findHistory(userId, SUBSCRIPTION_HISTORY_LIMIT);
    const plan = withTestGrant(this.testGrant, effectivePlan(history, now));

    const latestSettled = history.find((subscription) => subscription.status !== "pending");
    const shown = latestSettled ?? history[0];
    const offeredPlan = PAID_PLAN_KEYS[0];

    return {
      plan,
      features: [...planFeatures(plan)],
      status: shown?.status ?? null,
      trialEndsAt: shown?.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: shown?.currentPeriodEnd?.toISOString() ?? null,
      isTrialEligible: isTrialEligible(history),
      hasPendingCheckout: history.some((subscription) => subscription.status === "pending"),
      price: planPrice(offeredPlan),
    };
  }
}
