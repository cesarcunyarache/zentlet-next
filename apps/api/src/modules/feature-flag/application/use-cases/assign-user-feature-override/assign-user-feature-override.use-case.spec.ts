import { beforeEach, describe, expect, it } from 'vitest';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import { FakeLogger } from '../../../infrastructure/fake-logger.js';
import { InMemoryUserFeatureRepository } from '../../../infrastructure/user-feature/in-memory-user-feature.repository.js';
import { AssignUserFeatureOverrideUseCase } from './assign-user-feature-override.use-case.js';

describe('AssignUserFeatureOverrideUseCase', () => {
  let userFeatureRepository: InMemoryUserFeatureRepository;
  let useCase: AssignUserFeatureOverrideUseCase;

  beforeEach(() => {
    userFeatureRepository = new InMemoryUserFeatureRepository();
    useCase = new AssignUserFeatureOverrideUseCase(userFeatureRepository, new KvService(null, new FakeLogger()));
  });

  it('reports a missing flag', async () => {
    expect(await useCase.execute({ userId: 'u1', slug: 'missing', enabled: true, actor: 'admin' })).toEqual({
      error: 'flag_not_found',
    });
  });

  it('assigns an override for a known flag', async () => {
    userFeatureRepository.seedFlag('new-home');

    const result = await useCase.execute({ userId: 'u1', slug: 'new-home', enabled: true, actor: 'admin' });

    expect(result).toEqual({
      override: expect.objectContaining({ userId: 'u1', featureId: 'new-home', enabled: true, assignedBy: 'admin' }),
    });
    expect(await userFeatureRepository.findOverride('u1', 'new-home')).toMatchObject({ enabled: true });
  });
});
