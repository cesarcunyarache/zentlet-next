import { Injectable } from '@nestjs/common';
import { isLive } from '../application/rules/subscription-lifecycle.rules.js';
import type {
  Cancellation,
  DueSubscriptionsQuery,
  NewSubscription,
  ProviderState,
  Subscription,
} from '../domain/entities/subscription.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';

@Injectable()
export class InMemorySubscriptionRepository extends SubscriptionRepository {
  private readonly subscriptions = new Map<string, Subscription>();

  async findHistory(userId: string, limit: number): Promise<Subscription[]> {
    return [...this.subscriptions.values()]
      .filter((subscription) => subscription.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async findLive(userId: string): Promise<Subscription | null> {
    return (
      [...this.subscriptions.values()].find(
        (subscription) => subscription.userId === userId && isLive(subscription.status),
      ) ?? null
    );
  }

  async findByExternalId(provider: string, externalId: string): Promise<Subscription | null> {
    return (
      [...this.subscriptions.values()].find(
        (subscription) => subscription.provider === provider && subscription.externalId === externalId,
      ) ?? null
    );
  }

  async findByReference(provider: string, id: string): Promise<Subscription | null> {
    const subscription = this.subscriptions.get(id);
    return subscription && subscription.provider === provider ? subscription : null;
  }

  async findDue({ pendingCreatedBefore, periodEndedBefore, limit }: DueSubscriptionsQuery): Promise<Subscription[]> {
    return [...this.subscriptions.values()]
      .filter((subscription) => {
        const stalePending = subscription.status === 'pending' && subscription.createdAt < pendingCreatedBefore;
        const expiredPeriod =
          (subscription.status === 'trialing' || subscription.status === 'active') &&
          subscription.currentPeriodEnd !== null &&
          subscription.currentPeriodEnd < periodEndedBefore;
        const pastDue = subscription.status === 'past_due';
        return stalePending || expiredPeriod || pastDue;
      })
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, limit);
  }

  async createPending(subscription: NewSubscription): Promise<Subscription | 'live_exists'> {
    const alreadyLive = [...this.subscriptions.values()].some(
      (existing) => existing.userId === subscription.userId && isLive(existing.status),
    );
    if (alreadyLive) return 'live_exists';

    const now = new Date();
    const created: Subscription = {
      ...subscription,
      id: crypto.randomUUID(),
      status: 'pending',
      externalId: null,
      checkoutUrl: null,
      currentPeriodEnd: null,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(created.id, created);
    return created;
  }

  async attachCheckout(id: string, externalId: string, checkoutUrl: string): Promise<void> {
    this.update(id, { externalId, checkoutUrl });
  }

  async markAbandoned(id: string, abandonedAt: Date): Promise<void> {
    this.update(id, { status: 'canceled', canceledAt: abandonedAt, trialEndsAt: null, checkoutUrl: null });
  }

  async markCanceled(id: string, { canceledAt, accessUntil }: Cancellation): Promise<void> {
    this.update(id, { status: 'canceled', canceledAt, currentPeriodEnd: accessUntil, checkoutUrl: null });
  }

  async applyProviderState(id: string, state: ProviderState): Promise<Subscription> {
    return this.update(id, state);
  }

  private update(id: string, patch: Partial<Subscription>): Subscription {
    const existing = this.subscriptions.get(id);
    if (!existing) throw new Error(`Subscription not found: ${id}`);
    const updated: Subscription = { ...existing, ...patch, updatedAt: new Date() };
    this.subscriptions.set(id, updated);
    return updated;
  }
}
