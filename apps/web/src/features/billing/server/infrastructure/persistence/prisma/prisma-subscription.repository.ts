import type { Prisma } from "@/generated/prisma/client";
import { isUniqueViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import { LIVE_STATUSES } from "../../../../lib/lifecycle";
import type {
  Cancellation,
  DueSubscriptionsQuery,
  NewSubscription,
  ProviderState,
} from "../../../domain/entities/subscription.entity";
import type { SubscriptionRepository } from "../../../domain/repositories/subscription.repository";
import { toSubscription, toSubscriptionOrNull } from "./billing.mapper";

export class PrismaSubscriptionRepository implements SubscriptionRepository {
  async findHistory(userId: string, limit: number) {
    const rows = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toSubscription);
  }

  async findLive(userId: string) {
    const row = await prisma.subscription.findFirst({
      where: { userId, status: { in: [...LIVE_STATUSES] } },
    });
    return toSubscriptionOrNull(row);
  }

  async findByExternalId(provider: string, externalId: string) {
    const row = await prisma.subscription.findUnique({
      where: { provider_externalId: { provider, externalId } },
    });
    return toSubscriptionOrNull(row);
  }

  async findByReference(provider: string, id: string) {
    const row = await prisma.subscription.findFirst({ where: { id, provider } });
    return toSubscriptionOrNull(row);
  }

  async findDue({ pendingCreatedBefore, periodEndedBefore, limit }: DueSubscriptionsQuery) {
    const stalePending: Prisma.SubscriptionWhereInput = {
      status: "pending",
      createdAt: { lt: pendingCreatedBefore },
    };
    const expiredPeriod: Prisma.SubscriptionWhereInput = {
      status: { in: ["trialing", "active"] },
      currentPeriodEnd: { lt: periodEndedBefore },
    };
    const pastDue: Prisma.SubscriptionWhereInput = { status: "past_due" };

    const rows = await prisma.subscription.findMany({
      where: { OR: [stalePending, expiredPeriod, pastDue] },
      orderBy: { updatedAt: "asc" },
      take: limit,
    });
    return rows.map(toSubscription);
  }

  async createPending(subscription: NewSubscription) {
    try {
      const row = await prisma.subscription.create({ data: { ...subscription, status: "pending" } });
      return toSubscription(row);
    } catch (error) {
      const anotherSubscriptionIsLive = isUniqueViolation(error);
      if (anotherSubscriptionIsLive) return "live_exists" as const;
      throw error;
    }
  }

  async attachCheckout(id: string, externalId: string, checkoutUrl: string) {
    await prisma.subscription.update({ where: { id }, data: { externalId, checkoutUrl } });
  }

  async markAbandoned(id: string, abandonedAt: Date) {
    await prisma.subscription.update({
      where: { id },
      data: { status: "canceled", canceledAt: abandonedAt, trialEndsAt: null, checkoutUrl: null },
    });
  }

  async markCanceled(id: string, { canceledAt, accessUntil }: Cancellation) {
    await prisma.subscription.update({
      where: { id },
      data: { status: "canceled", canceledAt, currentPeriodEnd: accessUntil, checkoutUrl: null },
    });
  }

  async applyProviderState(id: string, state: ProviderState) {
    const row = await prisma.subscription.update({ where: { id }, data: state });
    return toSubscription(row);
  }
}
