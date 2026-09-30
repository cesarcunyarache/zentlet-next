export interface FlagState {
  slug: string;
  enabled: boolean;
  rollout: number;
  userEnabled: boolean | null;
}

const BUCKETS = 100;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function rolloutBucket(slug: string, userId: string) {
  let hash = FNV_OFFSET;
  for (const char of `${slug}:${userId}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash % BUCKETS;
}

export function isFlagOn(flag: FlagState, userId: string) {
  if (!flag.enabled) return false;
  if (flag.userEnabled !== null) return flag.userEnabled;
  return rolloutBucket(flag.slug, userId) < flag.rollout;
}

export const enabledSlugs = (flags: FlagState[], userId: string) =>
  flags
    .filter((flag) => isFlagOn(flag, userId))
    .map(({ slug }) => slug)
    .sort();

export const isValidRollout = (value: number) => Number.isInteger(value) && value >= 0 && value <= BUCKETS;

const USAGE_THROTTLE_MS = 24 * 60 * 60 * 1000;

export const usageCutoff = (now: Date) => new Date(now.getTime() - USAGE_THROTTLE_MS);
