import { beforeEach, describe, expect, it } from 'vitest';
import { KvService } from '../../../../../shared/kv/application/kv.service.js';
import { FakeKeyValueStore } from '../../../infrastructure/fake-key-value-store.js';
import { FakeLogger } from '../../../infrastructure/fake-logger.js';
import { InMemoryFeatureRepository } from '../../../infrastructure/feature/in-memory-feature.repository.js';
import { InMemoryUserFeatureRepository } from '../../../infrastructure/user-feature/in-memory-user-feature.repository.js';
import type { Feature } from '../../../domain/feature/feature.js';
import { ResolveFeatureFlagUseCase } from './resolve-feature-flag.use-case.js';

const flag = (slug: string, enabled: boolean, rollout = 100): Feature => ({
  slug,
  enabled,
  rollout,
  description: null,
  type: 'RELEASE',
  stale: false,
  lastUsedAt: null,
  updatedBy: null,
});

describe('ResolveFeatureFlagUseCase', () => {
  let featureRepository: InMemoryFeatureRepository;
  let userFeatureRepository: InMemoryUserFeatureRepository;
  let useCase: ResolveFeatureFlagUseCase;

  beforeEach(() => {
    featureRepository = new InMemoryFeatureRepository();
    userFeatureRepository = new InMemoryUserFeatureRepository();
    const kv = new KvService(null, new FakeLogger());
    useCase = new ResolveFeatureFlagUseCase(featureRepository, userFeatureRepository, kv, new FakeLogger());
  });

  it('resolves an unknown slug as disabled', async () => {
    expect(await useCase.execute({ userId: 'u1', slug: 'missing' })).toEqual({ enabled: false });
  });

  it('respects the rollout percentage with no cache available', async () => {
    featureRepository.seed(flag('new-home', true, 100));

    expect(await useCase.execute({ userId: 'u1', slug: 'new-home' })).toEqual({ enabled: true });
  });

  it('an explicit override wins over the global rollout', async () => {
    featureRepository.seed(flag('new-home', true, 0));
    userFeatureRepository.seedFlag('new-home');
    await userFeatureRepository.assign('u1', 'new-home', true, 'admin');

    expect(await useCase.execute({ userId: 'u1', slug: 'new-home' })).toEqual({ enabled: true });
  });

  it('marks the flag as used without failing resolution when caching is unavailable', async () => {
    featureRepository.seed(flag('new-home', true, 100));

    await useCase.execute({ userId: 'u1', slug: 'new-home' });

    const stored = await featureRepository.findBySlug('new-home');
    expect(stored?.lastUsedAt).not.toBeNull();
  });

  it('works correctly with a real cache backing it, serving cached definitions on the second call', async () => {
    featureRepository.seed(flag('new-home', true, 100));
    const kv = new KvService(new FakeKeyValueStore(), new FakeLogger());
    const cachedUseCase = new ResolveFeatureFlagUseCase(featureRepository, userFeatureRepository, kv, new FakeLogger());

    expect(await cachedUseCase.execute({ userId: 'u1', slug: 'new-home' })).toEqual({ enabled: true });

    await featureRepository.update('new-home', { enabled: false }, 'admin');
    expect(await cachedUseCase.execute({ userId: 'u1', slug: 'new-home' })).toEqual({ enabled: true });
  });
});
