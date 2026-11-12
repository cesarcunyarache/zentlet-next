import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryBillingEventRepository } from '../../../infrastructure/in-memory-billing-event.repository.js';
import { InMemoryBillingPaymentRepository } from '../../../infrastructure/in-memory-billing-payment.repository.js';
import { InMemorySubscriptionRepository } from '../../../infrastructure/in-memory-subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import { FakeBillingProvider, FakeBillingProviderRegistry } from '../billing-test-doubles.js';
import { CreateCheckoutUseCase } from './create-checkout.use-case.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date();
const input = {
  userId: 'user-1',
  planKey: 'pro',
  payerEmail: 'ana@example.com',
  amount: 1490,
  currency: 'PEN',
  interval: 'month' as const,
  reason: 'Zentlet Pro',
  returnUrl: 'https://zentlet.app/admin?billing=return',
};

describe('CreateCheckoutUseCase', () => {
  let subscriptionRepository: InMemorySubscriptionRepository;
  let billingEventRepository: InMemoryBillingEventRepository;
  let provider: FakeBillingProvider;
  let useCase: CreateCheckoutUseCase;

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository();
    billingEventRepository = new InMemoryBillingEventRepository();
    provider = new FakeBillingProvider();
    const registry = new FakeBillingProviderRegistry(provider);
    const lifecycle = new SubscriptionLifecycleService(
      subscriptionRepository,
      new InMemoryBillingPaymentRepository(),
      billingEventRepository,
      registry,
    );
    useCase = new CreateCheckoutUseCase(subscriptionRepository, registry, billingEventRepository, lifecycle);
  });

  it('starts a trial checkout for a first-time subscriber', async () => {
    provider.createCheckout.mockResolvedValue({ externalId: 'pre-1', checkoutUrl: 'https://mp/checkout' });

    const outcome = await useCase.execute(input, NOW);

    expect(outcome).toEqual({ kind: 'redirect', checkoutUrl: 'https://mp/checkout' });
    const [created] = await subscriptionRepository.findHistory('user-1', 10);
    expect(created).toMatchObject({ status: 'pending', externalId: 'pre-1', checkoutUrl: 'https://mp/checkout' });
    expect(created.trialEndsAt).toEqual(new Date(NOW.getTime() + 15 * DAY_MS));
    expect(billingEventRepository.recorded).toContainEqual(
      expect.objectContaining({ type: 'checkout.started', subscriptionId: created.id }),
    );
  });

  it('refuses a new checkout when the subscription is already active', async () => {
    await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: null,
    });
    const [existing] = await subscriptionRepository.findHistory('user-1', 10);
    await subscriptionRepository.applyProviderState(existing.id, {
      status: 'active',
      externalId: 'pre-1',
      currentPeriodEnd: null,
      canceledAt: null,
    });

    expect(await useCase.execute(input, NOW)).toEqual({ kind: 'already_subscribed' });
    expect(provider.createCheckout).not.toHaveBeenCalled();
  });

  it('reuses a pending checkout created less than a day ago', async () => {
    const pending = await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: null,
    });
    if (pending === 'live_exists') throw new Error('unexpected live_exists');
    await subscriptionRepository.attachCheckout(pending.id, 'pre-1', 'https://mp/checkout');

    expect(await useCase.execute(input, NOW)).toEqual({ kind: 'redirect', checkoutUrl: 'https://mp/checkout' });
    expect(provider.createCheckout).not.toHaveBeenCalled();
  });

  it('abandons a stale pending checkout and starts a new one', async () => {
    const pending = await subscriptionRepository.createPending({
      userId: 'user-1',
      planKey: 'pro',
      amount: 1490,
      currency: 'PEN',
      interval: 'month',
      provider: 'mercadopago',
      trialEndsAt: null,
    });
    if (pending === 'live_exists') throw new Error('unexpected live_exists');
    await subscriptionRepository.attachCheckout(pending.id, 'pre-1', 'https://mp/checkout');
    provider.createCheckout.mockResolvedValue({ externalId: 'pre-2', checkoutUrl: 'https://mp/checkout-2' });

    // The pending row's createdAt is set to the real wall clock by the fake
    // repository, so "stale" is simulated by moving the use case's `now` ahead.
    const outcome = await useCase.execute(input, new Date(Date.now() + 2 * DAY_MS));

    expect(outcome).toEqual({ kind: 'redirect', checkoutUrl: 'https://mp/checkout-2' });
    const history = await subscriptionRepository.findHistory('user-1', 10);
    expect(history).toHaveLength(2);
    expect(history.find((subscription) => subscription.id === pending.id)).toMatchObject({ status: 'canceled' });
  });

  it('abandons the pending subscription when the gateway rejects the checkout', async () => {
    provider.createCheckout.mockRejectedValue(new Error('gateway down'));

    await expect(useCase.execute(input, NOW)).rejects.toThrow('gateway down');

    const [abandoned] = await subscriptionRepository.findHistory('user-1', 10);
    expect(abandoned).toMatchObject({ status: 'canceled', checkoutUrl: null });
  });
});
