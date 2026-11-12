export const FEATURE_TYPES = ['RELEASE', 'EXPERIMENT', 'OPERATIONAL', 'KILL_SWITCH', 'PERMISSION'] as const;

export type FeatureType = (typeof FEATURE_TYPES)[number];

export type Feature = {
  slug: string;
  enabled: boolean;
  rollout: number;
  description: string | null;
  type: FeatureType;
  stale: boolean;
  lastUsedAt: Date | null;
  updatedBy: string | null;
};

export type FlagDefinition = Pick<Feature, 'slug' | 'enabled' | 'rollout'>;

export type FeatureChanges = Partial<Pick<Feature, 'enabled' | 'rollout' | 'description'>>;
