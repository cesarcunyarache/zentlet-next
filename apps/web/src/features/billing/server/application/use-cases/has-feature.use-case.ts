import { can } from "../../../lib/entitlements";
import type { Feature } from "../../../lib/plans";
import type { GetEffectivePlanUseCase } from "./get-effective-plan.use-case";

export class HasFeatureUseCase {
  constructor(private readonly getEffectivePlan: GetEffectivePlanUseCase) {}

  async execute(userId: string, feature: Feature) {
    const plan = await this.getEffectivePlan.execute(userId);
    return can(plan, feature);
  }
}
