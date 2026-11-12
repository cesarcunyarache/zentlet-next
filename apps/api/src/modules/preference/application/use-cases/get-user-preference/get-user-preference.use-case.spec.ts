import { describe, expect, it } from 'vitest';
import { InMemoryUserPreferenceRepository } from '../../../infrastructure/preference/in-memory-user-preference.repository.js';
import { GetUserPreferenceUseCase } from './get-user-preference.use-case.js';

describe('GetUserPreferenceUseCase', () => {
  it('returns null when the user has no stored preferences yet', async () => {
    const repository = new InMemoryUserPreferenceRepository();
    const useCase = new GetUserPreferenceUseCase(repository);

    expect(await useCase.execute({ userId: 'user-1' })).toBeNull();
  });

  it('returns the stored preferences for the user', async () => {
    const repository = new InMemoryUserPreferenceRepository();
    await repository.upsert('user-1', { currency: 'USD' });
    const useCase = new GetUserPreferenceUseCase(repository);

    expect(await useCase.execute({ userId: 'user-1' })).toEqual({
      language: 'es',
      currency: 'USD',
      timezone: 'America/Lima',
      extras: {},
    });
  });
});
