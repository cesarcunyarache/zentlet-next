import { beforeEach, describe, expect, it } from 'vitest';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import { FakeLogger } from '../../../infrastructure/fake-logger.js';
import { InMemoryFeatureRepository } from '../../../infrastructure/feature/in-memory-feature.repository.js';
import type { Feature } from '../../../domain/feature/feature.js';
import { SetFeatureFlagUseCase } from './set-feature-flag.use-case.js';

const flag = (slug: string): Feature => ({
  slug,
  enabled: false,
  rollout: 100,
  description: null,
  type: 'RELEASE',
  stale: false,
  lastUsedAt: null,
  updatedBy: null,
});

describe('SetFeatureFlagUseCase', () => {
  let featureRepository: InMemoryFeatureRepository;
  let useCase: SetFeatureFlagUseCase;

  beforeEach(() => {
    featureRepository = new InMemoryFeatureRepository();
    featureRepository.seed(flag('new-home'));
    useCase = new SetFeatureFlagUseCase(featureRepository, new KvService(null, new FakeLogger()));
  });

  it('rejects an out-of-range rollout', async () => {
    expect(await useCase.execute({ slug: 'new-home', actor: 'admin', rollout: 150 })).toEqual({
      error: 'invalid_rollout',
    });
  });

  it('reports a missing flag', async () => {
    expect(await useCase.execute({ slug: 'missing', actor: 'admin', enabled: true })).toEqual({
      error: 'flag_not_found',
    });
  });

  it('updates enabled, rollout, and description', async () => {
    const result = await useCase.execute({ slug: 'new-home', actor: 'admin', enabled: true, rollout: 5, description: 'Rollout' });

    expect(result).toEqual({
      flag: expect.objectContaining({ slug: 'new-home', enabled: true, rollout: 5, description: 'Rollout', updatedBy: 'admin' }),
    });
  });
});
