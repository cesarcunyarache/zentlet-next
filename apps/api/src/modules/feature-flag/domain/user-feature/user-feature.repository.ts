import type { UserFeature } from './user-feature.js';

export abstract class UserFeatureRepository {
  abstract findOverride(userId: string, slug: string): Promise<UserFeature | null>;
  abstract assign(userId: string, slug: string, enabled: boolean, actor: string): Promise<UserFeature | 'flag_not_found'>;
  abstract remove(userId: string, slug: string): Promise<void>;
}
