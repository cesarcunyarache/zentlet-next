import type { Feature, FeatureChanges } from './feature.js';

export abstract class FeatureRepository {
  abstract findAll(): Promise<Feature[]>;
  abstract findBySlug(slug: string): Promise<Feature | null>;
  abstract update(slug: string, changes: FeatureChanges, actor: string): Promise<Feature | null>;
  abstract markStale(slug: string, stale: boolean): Promise<Feature | null>;
  abstract markUsed(slug: string, notUsedSince: Date, usedAt: Date): Promise<void>;
}
