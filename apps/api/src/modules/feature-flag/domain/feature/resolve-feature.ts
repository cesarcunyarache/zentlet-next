import type { FlagDefinition } from './feature.js';

const BUCKETS = 100;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const USAGE_THROTTLE_MS = 24 * 60 * 60 * 1000;

/**
 * Deterministic per-user bucket (0-99) for a flag, ported from the FNV-1a hash
 * the Next.js app uses so a given user keeps the same bucket across both apps.
 */
export function rolloutBucket(slug: string, userId: string): number {
  let hash = FNV_OFFSET;
  for (const char of `${slug}:${userId}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash % BUCKETS;
}

/**
 * An explicit per-user override always wins. Otherwise the flag must be
 * globally enabled and the user's bucket must fall under the rollout percentage.
 */
export function resolveFeatureFlag(definition: FlagDefinition, userId: string, override: boolean | null): boolean {
  if (!definition.enabled) return false;
  if (override !== null) return override;
  return rolloutBucket(definition.slug, userId) < definition.rollout;
}

export const isValidRollout = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= BUCKETS;

export const usageCutoff = (now: Date): Date => new Date(now.getTime() - USAGE_THROTTLE_MS);
