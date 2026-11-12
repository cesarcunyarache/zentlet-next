import { Injectable } from '@nestjs/common';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import { UserFeatureRepository } from '../../../domain/user-feature/user-feature.repository.js';
import { userOverrideKey } from '../../feature-flag-cache.keys.js';
import type { RemoveUserFeatureOverrideInput } from './remove-user-feature-override.input.js';
import type { RemoveUserFeatureOverrideOutput } from './remove-user-feature-override.output.js';

@Injectable()
export class RemoveUserFeatureOverrideUseCase {
  constructor(
    private readonly userFeatureRepository: UserFeatureRepository,
    private readonly kv: KvService,
  ) {}

  async execute({ userId, slug }: RemoveUserFeatureOverrideInput): Promise<RemoveUserFeatureOverrideOutput> {
    await this.userFeatureRepository.remove(userId, slug);
    await this.kv.withStore((store) => store.delete(userOverrideKey(userId, slug)));
    return { ok: true };
  }
}
