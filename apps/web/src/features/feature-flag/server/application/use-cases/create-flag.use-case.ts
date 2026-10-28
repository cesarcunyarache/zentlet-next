import type { NewFeatureFlag } from "../../domain/entities/feature-flag.entity";
import { fail } from "../../domain/errors/feature-flag.errors";
import type { FlagCache } from "../../domain/ports/feature-flag.ports";
import type { FeatureFlagRepository } from "../../domain/repositories/feature-flag.repository";

export class CreateFlagUseCase {
  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly flagCache: FlagCache,
  ) {}

  async execute(input: NewFeatureFlag, actor: string) {
    const created = await this.featureFlagRepository.insert(input, actor);
    if (created === "slug_taken") return fail("slug_taken");

    await this.flagCache.forgetFlag(input.slug);
    return { flag: created };
  }
}
