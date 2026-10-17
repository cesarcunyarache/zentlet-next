import { isFlagOn, usageCutoff } from "../../../lib/resolve";
import type { FlagCache, FlagMonitor } from "../../domain/ports/feature-flag.ports";
import type { FeatureFlagRepository } from "../../domain/repositories/feature-flag.repository";
import type { FlagStates } from "../services/flag-states.service";

export class IsFlagEnabledUseCase {
  constructor(
    private readonly flagStates: FlagStates,
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly flagCache: FlagCache,
    private readonly flagMonitor: FlagMonitor,
  ) {}

  async execute(userId: string, slug: string) {
    const states = await this.flagStates.forUser(userId);
    const flag = states.find((state) => state.slug === slug);
    if (!flag) return false;

    await this.markUsed(slug);

    const isOn = isFlagOn(flag, userId);
    this.flagMonitor.evaluated(slug, isOn);
    return isOn;
  }

  private async markUsed(slug: string) {
    const isFirstCheckInWindow = await this.flagCache.claimUsageMark(slug);
    if (!isFirstCheckInWindow) return;

    try {
      const now = new Date();
      await this.featureFlagRepository.markUsed(slug, usageCutoff(now), now);
    } catch (error) {
      this.flagMonitor.usageMarkFailed(error, slug);
    }
  }
}
