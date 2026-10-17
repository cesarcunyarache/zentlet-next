import type { Feature as FeatureRow } from "@/generated/prisma/client";
import type { FeatureFlag, FeatureFlagWithUsage } from "../../../domain/entities/feature-flag.entity";

export function toFeatureFlag(row: FeatureRow): FeatureFlag {
  return {
    slug: row.slug,
    enabled: row.enabled,
    rollout: row.rollout,
    description: row.description,
    type: row.type,
    stale: row.stale,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function toFeatureFlagWithUsage(row: FeatureRow & { _count: { users: number } }): FeatureFlagWithUsage {
  return { ...toFeatureFlag(row), assignedUsers: row._count.users };
}
