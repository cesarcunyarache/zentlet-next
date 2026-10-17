import { cached, invalidate } from "@/lib/cache";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import { getBillingProvider, isProviderName } from "../../providers";
import type { BillingMonitor, BillingProviders, PlanCache, TestGrant } from "../domain/ports/billing.ports";

const PLAN_CACHE_SECONDS = 60;

const planCacheKey = (userId: string) => `billing:plan:${userId}`;

export const billingProviders: BillingProviders = {
  current: () => getBillingProvider(),
  get: (name) => getBillingProvider(name),
  isKnown: (name) => isProviderName(name),
};

export const planCache: PlanCache = {
  get: (userId, load) => cached(planCacheKey(userId), PLAN_CACHE_SECONDS, load),
  forget: (userId) => invalidate(planCacheKey(userId)),
};

export const testGrant: TestGrant = {
  isEnabled: () => process.env.VERCEL_ENV !== "production" && process.env.BILLING_GRANT_PRO === "true",
};

export const billingMonitor: BillingMonitor = {
  warn: (message, context) => logger.warn(context, message),
  failed: (error, message, context) => reportError(error, message, context),
};
