import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { recordFlag } from "@/lib/observability/server";
import { enabledSlugs, isFlagOn, usageCutoff } from "../lib/resolve";

const flagSelect = (userId: string) =>
  ({
    slug: true,
    enabled: true,
    rollout: true,
    users: { where: { userId }, select: { enabled: true } },
  }) as const;

const toState = (row: { slug: string; enabled: boolean; rollout: number; users: { enabled: boolean }[] }) => ({
  slug: row.slug,
  enabled: row.enabled,
  rollout: row.rollout,
  userEnabled: row.users[0]?.enabled ?? null,
});

async function markUsed(slug: string) {
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
  const rows = await prisma.feature.findMany({ select: flagSelect(userId) });
  return enabledSlugs(rows.map(toState), userId);
}

export async function isFlagEnabled(userId: string, slug: string) {
  const row = await prisma.feature.findUnique({ where: { slug }, select: flagSelect(userId) });
  if (!row) return false;
  await markUsed(slug);
  const isOn = isFlagOn(toState(row), userId);
  recordFlag(slug, isOn);
  return isOn;
}
