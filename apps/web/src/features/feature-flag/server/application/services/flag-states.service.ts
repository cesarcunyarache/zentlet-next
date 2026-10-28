import type { FlagCache } from "../../domain/ports/feature-flag.ports";
import type { FeatureFlagRepository } from "../../domain/repositories/feature-flag.repository";
import type { UserFlagRepository } from "../../domain/repositories/user-flag.repository";

export class FlagStates {
  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly userFlagRepository: UserFlagRepository,
    private readonly flagCache: FlagCache,
  ) {}

  async forUser(userId: string) {
    const [definitions, overrides] = await Promise.all([
      this.flagCache.definitions(() => this.featureFlagRepository.findDefinitions()),
      this.flagCache.userOverrides(userId, () => this.userFlagRepository.findOverrides(userId)),
    ]);

    return definitions.map((flag) => ({ ...flag, userEnabled: overrides[flag.slug] ?? null }));
  }
}
