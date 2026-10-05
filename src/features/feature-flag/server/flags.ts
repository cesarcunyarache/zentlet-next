import { cached, invalidate, isFirstWithin } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { recordFlag } from "@/lib/observability/server";
import { enabledSlugs, isFlagOn, usageCutoff } from "../lib/resolve";

const CACHE_SECONDS = 30;
const USAGE_MARK_SECONDS = 60 * 60;

const DEFINITIONS_KEY = "flags:definitions";
const userOverridesKey = (userId: string) => `flags:user:${userId}`;
const usageMarkKey = (slug: string) => `flags:used:${slug}`;

export const forgetFlag = (slug: string) => invalidate(DEFINITIONS_KEY, usageMarkKey(slug));
export const forgetUserFlags = (userId: string) => invalidate(userOverridesKey(userId));

const loadDefinitions = () =>
  cached(DEFINITIONS_KEY, CACHE_SECONDS, () =>
    prisma.feature.findMany({ select: { slug: true, enabled: true, rollout: true } }),
  );

const loadUserOverrides = (userId: string) =>
  cached(userOverridesKey(userId), CACHE_SECONDS, async () => {
    const rows = await prisma.userFeature.findMany({ where: { userId }, select: { featureId: true, enabled: true } });
    return Object.fromEntries(rows.map((row) => [row.featureId, row.enabled])) as Record<string, boolean>;
  });

async function flagStates(userId: string) {
  const [definitions, overrides] = await Promise.all([loadDefinitions(), loadUserOverrides(userId)]);
  return definitions.map((flag) => ({ ...flag, userEnabled: overrides[flag.slug] ?? null }));
}

async function markUsed(slug: string) {
  if (!(await isFirstWithin(usageMarkKey(slug), USAGE_MARK_SECONDS))) return;
  try {
    await prisma.feature.updateMany({
      where: { slug, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: usageCutoff(new Date()) } }] },
      data: { lastUsedAt: new Date() },
    });
  } catch (error) {
    logger.warn({ err: error, slug }, "feature_flag.mark_used_failed");
  }
}

export async function getEnabledFlags(userId: string) {
  return enabledSlugs(await flagStates(userId), userId);
}

export async function isFlagEnabled(userId: string, slug: string) {
  const flag = (await flagStates(userId)).find((state) => state.slug === slug);
  if (!flag) return false;
  await markUsed(slug);
  const isOn = isFlagOn(flag, userId);
  recordFlag(slug, isOn);
  return isOn;
}
