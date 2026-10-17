import { isValidRollout } from "../../../lib/resolve";
import type { FeatureFlagChanges } from "../../domain/entities/feature-flag.entity";
import { fail } from "../../domain/errors/feature-flag.errors";
import type { FlagCache } from "../../domain/ports/feature-flag.ports";
import type { FeatureFlagRepository } from "../../domain/repositories/feature-flag.repository";

export class UpdateFlagUseCase {
  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly flagCache: FlagCache,
  ) {}

  async execute(slug: string, changes: FeatureFlagChanges, actor: string) {
    const hasInvalidRollout = changes.rollout !== undefined && !isValidRollout(changes.rollout);
    if (hasInvalidRollout) return fail("invalid_rollout");

    const updated = await this.featureFlagRepository.update(slug, changes, actor);
    if (updated === "flag_not_found") return fail("flag_not_found");

    await this.flagCache.forgetFlag(slug);
    return { flag: updated };
  }
}
