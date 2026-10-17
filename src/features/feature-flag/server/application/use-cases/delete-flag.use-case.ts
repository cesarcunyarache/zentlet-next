import { fail } from "../../domain/errors/feature-flag.errors";
import type { FlagCache } from "../../domain/ports/feature-flag.ports";
import type { FeatureFlagRepository } from "../../domain/repositories/feature-flag.repository";

export class DeleteFlagUseCase {
  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly flagCache: FlagCache,
  ) {}

  async execute(slug: string) {
    const result = await this.featureFlagRepository.delete(slug);
    if (result === "flag_not_found") return fail("flag_not_found");

    await this.flagCache.forgetFlag(slug);
    return { ok: true as const };
  }
}
