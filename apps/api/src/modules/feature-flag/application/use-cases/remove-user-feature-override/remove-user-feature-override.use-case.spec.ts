import { beforeEach, describe, expect, it } from 'vitest';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import { FakeLogger } from '../../../infrastructure/fake-logger.js';
import { InMemoryUserFeatureRepository } from '../../../infrastructure/user-feature/in-memory-user-feature.repository.js';
import { RemoveUserFeatureOverrideUseCase } from './remove-user-feature-override.use-case.js';

describe('RemoveUserFeatureOverrideUseCase', () => {
  let userFeatureRepository: InMemoryUserFeatureRepository;
  let useCase: RemoveUserFeatureOverrideUseCase;

  beforeEach(() => {
    userFeatureRepository = new InMemoryUserFeatureRepository();
    useCase = new RemoveUserFeatureOverrideUseCase(userFeatureRepository, new KvService(null, new FakeLogger()));
  });

  it('clears an existing override, falling back to the global rollout', async () => {
    userFeatureRepository.seedFlag('new-home');
    await userFeatureRepository.assign('u1', 'new-home', true, 'admin');

    expect(await useCase.execute({ userId: 'u1', slug: 'new-home' })).toEqual({ ok: true });
    expect(await userFeatureRepository.findOverride('u1', 'new-home')).toBeNull();
  });

  it('is a no-op when there was no override', async () => {
    expect(await useCase.execute({ userId: 'u1', slug: 'new-home' })).toEqual({ ok: true });
  });
});
