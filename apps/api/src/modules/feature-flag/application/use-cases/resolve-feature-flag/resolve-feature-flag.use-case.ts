import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../../shared/logger/domain/logger.js';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import type { FlagDefinition } from '../../../domain/feature/feature.js';
import { FeatureRepository } from '../../../domain/feature/feature.repository.js';
import { resolveFeatureFlag, usageCutoff } from '../../../domain/feature/resolve-feature.js';
import { UserFeatureRepository } from '../../../domain/user-feature/user-feature.repository.js';
import {
  DEFINITIONS_KEY,
  DEFINITIONS_TTL_SECONDS,
  USAGE_MARK_TTL_SECONDS,
  USER_OVERRIDE_TTL_SECONDS,
  usageMarkKey,
  userOverrideKey,
} from '../../feature-flag-cache.keys.js';
import type { ResolveFeatureFlagInput } from './resolve-feature-flag.input.js';
import type { ResolveFeatureFlagOutput } from './resolve-feature-flag.output.js';

@Injectable()
export class ResolveFeatureFlagUseCase {
  constructor(
    private readonly featureRepository: FeatureRepository,
    private readonly userFeatureRepository: UserFeatureRepository,
    private readonly kv: KvService,
    private readonly logger: Logger,
  ) {}

  async execute({ userId, slug }: ResolveFeatureFlagInput): Promise<ResolveFeatureFlagOutput> {
    const definitions = await this.definitions();
    const definition = definitions.find((candidate) => candidate.slug === slug);
    if (!definition) return { enabled: false };

    await this.markUsed(slug);

    const override = await this.override(userId, slug);
    return { enabled: resolveFeatureFlag(definition, userId, override) };
  }

  private async definitions(): Promise<FlagDefinition[]> {
    const cached = await this.kv.withStore((store) => store.get(DEFINITIONS_KEY));
    if (cached !== null) return JSON.parse(cached) as FlagDefinition[];

    const definitions = (await this.featureRepository.findAll()).map(
      ({ slug, enabled, rollout }): FlagDefinition => ({ slug, enabled, rollout }),
    );
    await this.kv.withStore((store) => store.set(DEFINITIONS_KEY, JSON.stringify(definitions), DEFINITIONS_TTL_SECONDS));
    return definitions;
  }

  private async override(userId: string, slug: string): Promise<boolean | null> {
    const key = userOverrideKey(userId, slug);
    const cached = await this.kv.withStore((store) => store.get(key));
    if (cached !== null) return JSON.parse(cached) as boolean | null;

    const override = await this.userFeatureRepository.findOverride(userId, slug);
    const value = override?.enabled ?? null;
    await this.kv.withStore((store) => store.set(key, JSON.stringify(value), USER_OVERRIDE_TTL_SECONDS));
    return value;
  }

  private async markUsed(slug: string): Promise<void> {
    const claimed = await this.kv.withStore((store) => store.setIfAbsent(usageMarkKey(slug), '1', USAGE_MARK_TTL_SECONDS));
    if (claimed === false) return;

    try {
      const now = new Date();
      await this.featureRepository.markUsed(slug, usageCutoff(now), now);
    } catch (error) {
      this.logger.warn({ err: error, slug }, 'feature_flag.mark_used_failed');
    }
  }
}
