import type { UserPreference } from './user-preference.js';

export abstract class UserPreferenceRepository {
  abstract findByUserId(userId: string): Promise<UserPreference | null>;
  abstract upsert(userId: string, changes: Partial<UserPreference>): Promise<UserPreference>;
}
