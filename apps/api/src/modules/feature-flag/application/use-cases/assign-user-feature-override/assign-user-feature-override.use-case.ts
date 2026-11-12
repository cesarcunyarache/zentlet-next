import { Injectable } from '@nestjs/common';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import { fail } from '../../../domain/feature-flag.errors.js';
import { UserFeatureRepository } from '../../../domain/user-feature/user-feature.repository.js';
import { userOverrideKey } from '../../feature-flag-cache.keys.js';
import type { AssignUserFeatureOverrideInput } from './assign-user-feature-override.input.js';
import type { AssignUserFeatureOverrideOutput } from './assign-user-feature-override.output.js';

@Injectable()
export class AssignUserFeatureOverrideUseCase {
  constructor(
    private readonly userFeatureRepository: UserFeatureRepository,
    private readonly kv: KvService,
  ) {}

  async execute({ userId, slug, enabled, actor }: AssignUserFeatureOverrideInput): Promise<AssignUserFeatureOverrideOutput> {
    const assigned = await this.userFeatureRepository.assign(userId, slug, enabled, actor);
    if (assigned === 'flag_not_found') return fail('flag_not_found');

    await this.kv.withStore((store) => store.delete(userOverrideKey(userId, slug)));
    return { override: assigned };
  }
}
