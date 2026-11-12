import { Injectable } from '@nestjs/common';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  DEFAULT_TIMEZONE,
  type UserPreference,
} from '../../domain/preference/user-preference.js';
import { UserPreferenceRepository } from '../../domain/preference/user-preference.repository.js';

@Injectable()
export class InMemoryUserPreferenceRepository extends UserPreferenceRepository {
  private readonly preferences = new Map<string, UserPreference>();

  async findByUserId(userId: string): Promise<UserPreference | null> {
    return this.preferences.get(userId) ?? null;
  }

  async upsert(userId: string, changes: Partial<UserPreference>): Promise<UserPreference> {
    const current = this.preferences.get(userId);
    const updated: UserPreference = {
      language: changes.language ?? current?.language ?? DEFAULT_LANGUAGE,
      currency: changes.currency ?? current?.currency ?? DEFAULT_CURRENCY,
      timezone: changes.timezone ?? current?.timezone ?? DEFAULT_TIMEZONE,
      extras: changes.extras ?? current?.extras ?? {},
    };
    this.preferences.set(userId, updated);
    return updated;
  }
}
