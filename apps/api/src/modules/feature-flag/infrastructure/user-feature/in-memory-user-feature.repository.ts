import { Injectable } from '@nestjs/common';
import type { UserFeature } from '../../domain/user-feature/user-feature.js';
import { UserFeatureRepository } from '../../domain/user-feature/user-feature.repository.js';

@Injectable()
export class InMemoryUserFeatureRepository extends UserFeatureRepository {
  private readonly overrides = new Map<string, UserFeature>();
  private readonly knownSlugs = new Set<string>();

  seedFlag(slug: string): void {
    this.knownSlugs.add(slug);
  }

  private key(userId: string, slug: string): string {
    return `${userId}:${slug}`;
  }

  async findOverride(userId: string, slug: string): Promise<UserFeature | null> {
    return this.overrides.get(this.key(userId, slug)) ?? null;
  }

  async assign(userId: string, slug: string, enabled: boolean, actor: string): Promise<UserFeature | 'flag_not_found'> {
    if (!this.knownSlugs.has(slug)) return 'flag_not_found';

    const override: UserFeature = { userId, featureId: slug, enabled, assignedBy: actor, assignedAt: new Date() };
    this.overrides.set(this.key(userId, slug), override);
    return override;
  }

  async remove(userId: string, slug: string): Promise<void> {
    this.overrides.delete(this.key(userId, slug));
  }
}
