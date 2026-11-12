import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../shared/prisma/infrastructure/prisma.service.js';
import { LIVE_STATUSES } from '../application/rules/subscription-lifecycle.rules.js';
import type {
  Cancellation,
  DueSubscriptionsQuery,
  NewSubscription,
  ProviderState,
  Subscription,
} from '../domain/subscription.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import { isUniqueViolation } from './db-errors.js';
import { toSubscription, toSubscriptionOrNull } from './prisma-billing.mapper.js';

@Injectable()
export class PrismaSubscriptionRepository extends SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findHistory(userId: string, limit: number): Promise<Subscription[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toSubscription);
  }

  async findLive(userId: string): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: [...LIVE_STATUSES] } },
    });
    return toSubscriptionOrNull(row);
  }

  async findByExternalId(provider: string, externalId: string): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findUnique({
      where: { provider_externalId: { provider, externalId } },
    });
    return toSubscriptionOrNull(row);
  }

  async findByReference(provider: string, id: string): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findFirst({ where: { id, provider } });
    return toSubscriptionOrNull(row);
  }

  async findDue({ pendingCreatedBefore, periodEndedBefore, limit }: DueSubscriptionsQuery): Promise<Subscription[]> {
    const stalePending: Prisma.SubscriptionWhereInput = {
      status: 'pending',
      createdAt: { lt: pendingCreatedBefore },
    };
    const expiredPeriod: Prisma.SubscriptionWhereInput = {
      status: { in: ['trialing', 'active'] },
      currentPeriodEnd: { lt: periodEndedBefore },
    };
    const pastDue: Prisma.SubscriptionWhereInput = { status: 'past_due' };

    const rows = await this.prisma.subscription.findMany({
      where: { OR: [stalePending, expiredPeriod, pastDue] },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
    return rows.map(toSubscription);
  }

  async createPending(subscription: NewSubscription): Promise<Subscription | 'live_exists'> {
    try {
      const row = await this.prisma.subscription.create({ data: { ...subscription, status: 'pending' } });
      return toSubscription(row);
    } catch (error) {
      if (isUniqueViolation(error)) return 'live_exists';
      throw error;
    }
  }

  async attachCheckout(id: string, externalId: string, checkoutUrl: string): Promise<void> {
    await this.prisma.subscription.update({ where: { id }, data: { externalId, checkoutUrl } });
  }

  async markAbandoned(id: string, abandonedAt: Date): Promise<void> {
    await this.prisma.subscription.update({
      where: { id },
      data: { status: 'canceled', canceledAt: abandonedAt, trialEndsAt: null, checkoutUrl: null },
    });
  }

  async markCanceled(id: string, { canceledAt, accessUntil }: Cancellation): Promise<void> {
    await this.prisma.subscription.update({
      where: { id },
      data: { status: 'canceled', canceledAt, currentPeriodEnd: accessUntil, checkoutUrl: null },
    });
  }

  async applyProviderState(id: string, state: ProviderState): Promise<Subscription> {
    const row = await this.prisma.subscription.update({ where: { id }, data: state });
    return toSubscription(row);
  }
}
