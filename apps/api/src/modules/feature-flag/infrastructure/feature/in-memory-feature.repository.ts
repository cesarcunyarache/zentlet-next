import { Injectable } from '@nestjs/common';
import type { Feature, FeatureChanges } from '../../domain/feature/feature.js';
import { FeatureRepository } from '../../domain/feature/feature.repository.js';

@Injectable()
export class InMemoryFeatureRepository extends FeatureRepository {
  private readonly features = new Map<string, Feature>();

  seed(feature: Feature): void {
    this.features.set(feature.slug, feature);
  }

  async findAll(): Promise<Feature[]> {
    return [...this.features.values()];
  }

  async findBySlug(slug: string): Promise<Feature | null> {
    return this.features.get(slug) ?? null;
  }

  async update(slug: string, changes: FeatureChanges, actor: string): Promise<Feature | null> {
    const existing = this.features.get(slug);
    if (!existing) return null;

    const updated: Feature = { ...existing, ...changes, updatedBy: actor };
    this.features.set(slug, updated);
    return updated;
  }

  async markStale(slug: string, stale: boolean): Promise<Feature | null> {
    const existing = this.features.get(slug);
    if (!existing) return null;

    const updated: Feature = { ...existing, stale };
    this.features.set(slug, updated);
    return updated;
  }

  async markUsed(slug: string, notUsedSince: Date, usedAt: Date): Promise<void> {
    const existing = this.features.get(slug);
    if (!existing) return;
    if (existing.lastUsedAt && existing.lastUsedAt >= notUsedSince) return;

    this.features.set(slug, { ...existing, lastUsedAt: usedAt });
  }
}
