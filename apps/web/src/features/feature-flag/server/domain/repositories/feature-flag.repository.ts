import type {
  FeatureFlag,
  FeatureFlagChanges,
  FeatureFlagWithUsage,
  FlagDefinition,
  NewFeatureFlag,
} from "../entities/feature-flag.entity";

export interface FeatureFlagRepository {
  findAllWithUsage(): Promise<FeatureFlagWithUsage[]>;

  findDefinitions(): Promise<FlagDefinition[]>;

  insert(flag: NewFeatureFlag, actor: string): Promise<FeatureFlag | "slug_taken">;

  update(slug: string, changes: FeatureFlagChanges, actor: string): Promise<FeatureFlag | "flag_not_found">;

  delete(slug: string): Promise<"deleted" | "flag_not_found">;

  markUsed(slug: string, notUsedSince: Date, usedAt: Date): Promise<void>;
}
