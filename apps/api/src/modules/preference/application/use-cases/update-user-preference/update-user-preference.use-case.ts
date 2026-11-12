import { Injectable } from '@nestjs/common';
import {
  EmptyPreferenceUpdateError,
  InvalidCurrencyError,
  InvalidLanguageError,
  InvalidTimezoneError,
} from '../../../domain/preference.errors.js';
import { isSupportedCurrency, isSupportedLanguage, isValidTimezone } from '../../../domain/preference/user-preference.js';
import type { UserPreference } from '../../../domain/preference/user-preference.js';
import { UserPreferenceRepository } from '../../../domain/preference/user-preference.repository.js';
import type { UpdateUserPreferenceInput } from './update-user-preference.input.js';

@Injectable()
export class UpdateUserPreferenceUseCase {
  constructor(private readonly userPreferenceRepository: UserPreferenceRepository) {}

  async execute(input: UpdateUserPreferenceInput): Promise<UserPreference> {
    const changes = this.toValidatedChanges(input);
    if (Object.keys(changes).length === 0) throw new EmptyPreferenceUpdateError();

    return this.userPreferenceRepository.upsert(input.userId, changes);
  }

  private toValidatedChanges(input: UpdateUserPreferenceInput): Partial<UserPreference> {
    const changes: Partial<UserPreference> = {};

    if (input.language !== undefined) {
      if (!isSupportedLanguage(input.language)) throw new InvalidLanguageError(input.language);
      changes.language = input.language;
    }

    if (input.currency !== undefined) {
      if (!isSupportedCurrency(input.currency)) throw new InvalidCurrencyError(input.currency);
      changes.currency = input.currency;
    }

    if (input.timezone !== undefined) {
      if (!isValidTimezone(input.timezone)) throw new InvalidTimezoneError(input.timezone);
      changes.timezone = input.timezone;
    }

    // `extras` has no recognized fields yet; every value collapses to `{}`, mirroring the web app's schema.
    if (input.extras !== undefined) changes.extras = {};

    return changes;
  }
}
