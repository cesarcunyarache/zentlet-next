import type {
  Cancellation,
  DueSubscriptionsQuery,
  NewSubscription,
  ProviderState,
  Subscription,
} from './subscription.js';

export abstract class SubscriptionRepository {
  abstract findHistory(userId: string, limit: number): Promise<Subscription[]>;

  abstract findLive(userId: string): Promise<Subscription | null>;

  abstract findByExternalId(provider: string, externalId: string): Promise<Subscription | null>;

  abstract findByReference(provider: string, id: string): Promise<Subscription | null>;

  abstract findDue(query: DueSubscriptionsQuery): Promise<Subscription[]>;

  abstract createPending(subscription: NewSubscription): Promise<Subscription | 'live_exists'>;

  abstract attachCheckout(id: string, externalId: string, checkoutUrl: string): Promise<void>;

  abstract markAbandoned(id: string, abandonedAt: Date): Promise<void>;

  abstract markCanceled(id: string, cancellation: Cancellation): Promise<void>;

  abstract applyProviderState(id: string, state: ProviderState): Promise<Subscription>;
}
