export const DEFINITIONS_KEY = 'flags:definitions';
export const DEFINITIONS_TTL_SECONDS = 30;

export const userOverrideKey = (userId: string, slug: string): string => `flags:user:${userId}:${slug}`;
export const USER_OVERRIDE_TTL_SECONDS = 30;

export const usageMarkKey = (slug: string): string => `flags:used:${slug}`;
export const USAGE_MARK_TTL_SECONDS = 60 * 60;
