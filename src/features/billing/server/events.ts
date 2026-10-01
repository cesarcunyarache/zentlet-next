import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import type { BillingEventSource } from "../types";

interface BillingEventInput {
  source: BillingEventSource;
  type: string;
  userId?: string;
  subscriptionId?: string;
  data?: Prisma.InputJsonObject;
}

export async function recordBillingEvent({ source, type, userId, subscriptionId, data }: BillingEventInput) {
  logger.info({ source, userId, subscriptionId, ...data }, `billing.${type}`);
  try {
    await prisma.billingEvent.create({
      data: { source, type, userId, subscriptionId, data, processedAt: new Date() },
    });
  } catch (error) {
    reportError(error, "billing.event_record_failed", { type, subscriptionId });
  }
}
