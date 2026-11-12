import { Injectable } from '@nestjs/common';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import { FeatureRepository } from '../../../domain/feature/feature.repository.js';
import { fail } from '../../../domain/feature-flag.errors.js';
import { isValidRollout } from '../../../domain/feature/resolve-feature.js';
import { DEFINITIONS_KEY, usageMarkKey } from '../../feature-flag-cache.keys.js';
import type { SetFeatureFlagInput } from './set-feature-flag.input.js';
import type { SetFeatureFlagOutput } from './set-feature-flag.output.js';

@Injectable()
export class SetFeatureFlagUseCase {
  constructor(
    private readonly featureRepository: FeatureRepository,
    private readonly kv: KvService,
  ) {}

  async execute({ slug, actor, enabled, rollout, description }: SetFeatureFlagInput): Promise<SetFeatureFlagOutput> {
    if (rollout !== undefined && !isValidRollout(rollout)) return fail('invalid_rollout');

    const updated = await this.featureRepository.update(slug, { enabled, rollout, description }, actor);
    if (!updated) return fail('flag_not_found');

    await this.kv.withStore((store) => store.delete(DEFINITIONS_KEY, usageMarkKey(slug)));
    return { flag: updated };
  }
}
