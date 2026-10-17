import type {
  Cancellation,
  DueSubscriptionsQuery,
  NewSubscription,
  ProviderState,
  Subscription,
} from "../entities/subscription.entity";

export interface SubscriptionRepository {
  findHistory(userId: string, limit: number): Promise<Subscription[]>;

  findLive(userId: string): Promise<Subscription | null>;

  findByExternalId(provider: string, externalId: string): Promise<Subscription | null>;

  findByReference(provider: string, id: string): Promise<Subscription | null>;

  findDue(query: DueSubscriptionsQuery): Promise<Subscription[]>;

  createPending(subscription: NewSubscription): Promise<Subscription | "live_exists">;

  attachCheckout(id: string, externalId: string, checkoutUrl: string): Promise<void>;

  markAbandoned(id: string, abandonedAt: Date): Promise<void>;

  markCanceled(id: string, cancellation: Cancellation): Promise<void>;

  applyProviderState(id: string, state: ProviderState): Promise<Subscription>;
}
