import { cached, invalidate, isFirstWithin } from "@/lib/cache";
import { logger } from "@/lib/observability/logger";
import { recordFlag } from "@/lib/observability/server";
import prisma from "@/lib/prisma";
import type { FlagCache, FlagMonitor, UserDirectory } from "../domain/ports/feature-flag.ports";

const CACHE_SECONDS = 30;
const USAGE_MARK_SECONDS = 60 * 60;

const DEFINITIONS_KEY = "flags:definitions";
const userOverridesKey = (userId: string) => `flags:user:${userId}`;
const usageMarkKey = (slug: string) => `flags:used:${slug}`;

export const flagCache: FlagCache = {
  definitions: (load) => cached(DEFINITIONS_KEY, CACHE_SECONDS, load),
  userOverrides: (userId, load) => cached(userOverridesKey(userId), CACHE_SECONDS, load),
  forgetFlag: (slug) => invalidate(DEFINITIONS_KEY, usageMarkKey(slug)),
  forgetUser: (userId) => invalidate(userOverridesKey(userId)),
  claimUsageMark: (slug) => isFirstWithin(usageMarkKey(slug), USAGE_MARK_SECONDS),
};

export const userDirectory: UserDirectory = {
  async findIdByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return user?.id ?? null;
  },
};

export const flagMonitor: FlagMonitor = {
  evaluated: (slug, isOn) => recordFlag(slug, isOn),
  usageMarkFailed: (error, slug) => logger.warn({ err: error, slug }, "feature_flag.mark_used_failed"),
};
