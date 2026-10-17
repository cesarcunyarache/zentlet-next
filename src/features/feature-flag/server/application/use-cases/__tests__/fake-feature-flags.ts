import { vi } from "vitest";
import type { FeatureFlag } from "../../../domain/entities/feature-flag.entity";
import type { FlagCache, FlagMonitor, UserDirectory } from "../../../domain/ports/feature-flag.ports";
import type { FeatureFlagRepository } from "../../../domain/repositories/feature-flag.repository";
import type { UserFlagRepository } from "../../../domain/repositories/user-flag.repository";
import { FlagStates } from "../../services/flag-states.service";

export function flag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    slug: "beta",
    enabled: false,
    rollout: 100,
    description: null,
    type: "RELEASE",
    stale: false,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: "test",
    ...overrides,
  };
}

export function fakeFeatureFlags() {
  const flags: FeatureFlagRepository = {
    findAllWithUsage: vi.fn().mockResolvedValue([]),
    findDefinitions: vi.fn().mockResolvedValue([]),
    insert: vi.fn(async (input) => flag({ slug: input.slug })),
    update: vi.fn(async (slug, changes) => flag({ slug, ...changes })),
    delete: vi.fn().mockResolvedValue("deleted"),
    markUsed: vi.fn().mockResolvedValue(undefined),
  };
  const userFlags: UserFlagRepository = {
    findOverrides: vi.fn().mockResolvedValue({}),
    assign: vi.fn(async (userId, featureId, enabled, assignedBy) => ({
      userId,
      featureId,
      enabled,
      assignedBy,
      assignedAt: new Date(),
    })),
    clear: vi.fn().mockResolvedValue(undefined),
  };
  const cache: FlagCache = {
    definitions: vi.fn((load) => load()),
    userOverrides: vi.fn((_userId, load) => load()),
    forgetFlag: vi.fn().mockResolvedValue(undefined),
    forgetUser: vi.fn().mockResolvedValue(undefined),
    claimUsageMark: vi.fn().mockResolvedValue(true),
  };
  const users: UserDirectory = { findIdByEmail: vi.fn().mockResolvedValue("user-1") };
  const monitor: FlagMonitor = { evaluated: vi.fn(), usageMarkFailed: vi.fn() };
  const states = new FlagStates(flags, userFlags, cache);

  return { flags, userFlags, cache, users, monitor, states };
}
