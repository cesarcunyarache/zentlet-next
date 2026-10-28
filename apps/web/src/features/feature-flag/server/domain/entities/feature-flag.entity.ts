export const FEATURE_TYPES = ["RELEASE", "EXPERIMENT", "OPERATIONAL", "KILL_SWITCH", "PERMISSION"] as const;

export type FeatureType = (typeof FEATURE_TYPES)[number];

export interface FeatureFlag {
  slug: string;
  enabled: boolean;
  rollout: number;
  description: string | null;
  type: FeatureType;
  stale: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

export type FeatureFlagWithUsage = FeatureFlag & { assignedUsers: number };

export interface NewFeatureFlag {
  slug: string;
  type?: FeatureType;
  description?: string;
}

export type FeatureFlagChanges = Partial<Pick<FeatureFlag, "enabled" | "rollout" | "stale">>;

export type FlagDefinition = Pick<FeatureFlag, "slug" | "enabled" | "rollout">;

export type UserOverrides = Record<string, boolean>;

export interface UserFlagAssignment {
  userId: string;
  featureId: string;
  enabled: boolean;
  assignedBy: string;
  assignedAt: Date;
}
