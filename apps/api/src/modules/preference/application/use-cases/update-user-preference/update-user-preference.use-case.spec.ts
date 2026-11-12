import { describe, expect, it } from 'vitest';
import {
  EmptyPreferenceUpdateError,
  InvalidCurrencyError,
  InvalidLanguageError,
  InvalidTimezoneError,
} from '../../../domain/preference.errors.js';
import { InMemoryUserPreferenceRepository } from '../../../infrastructure/preference/in-memory-user-preference.repository.js';
import { UpdateUserPreferenceUseCase } from './update-user-preference.use-case.js';

describe('UpdateUserPreferenceUseCase', () => {
  it('creates the row with the documented defaults, overriding only the given field', async () => {
    const repository = new InMemoryUserPreferenceRepository();
    const useCase = new UpdateUserPreferenceUseCase(repository);

    const result = await useCase.execute({ userId: 'user-1', currency: 'USD' });

    expect(result).toEqual({ language: 'es', currency: 'USD', timezone: 'America/Lima', extras: {} });
    expect(await repository.findByUserId('user-1')).toEqual(result);
  });

  it('patches only the given fields, leaving the rest untouched', async () => {
    const repository = new InMemoryUserPreferenceRepository();
    await repository.upsert('user-1', { language: 'en', currency: 'EUR', timezone: 'Europe/Madrid' });
    const useCase = new UpdateUserPreferenceUseCase(repository);

    const result = await useCase.execute({ userId: 'user-1', currency: 'COP' });

    expect(result).toEqual({ language: 'en', currency: 'COP', timezone: 'Europe/Madrid', extras: {} });
  });

  it('accepts every preference at once', async () => {
    const repository = new InMemoryUserPreferenceRepository();
    const useCase = new UpdateUserPreferenceUseCase(repository);

    const result = await useCase.execute({
      userId: 'user-1',
      language: 'en',
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      extras: {},
    });

    expect(result).toEqual({ language: 'en', currency: 'EUR', timezone: 'Europe/Madrid', extras: {} });
  });

  it('collapses any extras payload to an empty object', async () => {
    const repository = new InMemoryUserPreferenceRepository();
    const useCase = new UpdateUserPreferenceUseCase(repository);

    const result = await useCase.execute({ userId: 'user-1', extras: { theme: 'dark' } });

    expect(result.extras).toEqual({});
  });

  it('rejects an unsupported currency', async () => {
    const useCase = new UpdateUserPreferenceUseCase(new InMemoryUserPreferenceRepository());

    await expect(useCase.execute({ userId: 'user-1', currency: 'BTC' })).rejects.toThrow(InvalidCurrencyError);
  });

  it('rejects a currency symbol instead of its code', async () => {
    const useCase = new UpdateUserPreferenceUseCase(new InMemoryUserPreferenceRepository());

    await expect(useCase.execute({ userId: 'user-1', currency: 'S/' })).rejects.toThrow(InvalidCurrencyError);
  });

  it('rejects a language without translations', async () => {
    const useCase = new UpdateUserPreferenceUseCase(new InMemoryUserPreferenceRepository());

    await expect(useCase.execute({ userId: 'user-1', language: 'fr' })).rejects.toThrow(InvalidLanguageError);
  });

  it('rejects a timezone that does not exist', async () => {
    const useCase = new UpdateUserPreferenceUseCase(new InMemoryUserPreferenceRepository());

    await expect(useCase.execute({ userId: 'user-1', timezone: 'Mars/Olympus' })).rejects.toThrow(
      InvalidTimezoneError,
    );
  });

  it('rejects an update with no fields', async () => {
    const useCase = new UpdateUserPreferenceUseCase(new InMemoryUserPreferenceRepository());

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(EmptyPreferenceUpdateError);
  });
});
