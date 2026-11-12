import { Injectable } from '@nestjs/common';
import { BillingProviderRegistry } from '../../../domain/billing-provider-registry.js';
import { BillingEventRepository } from '../../../domain/billing-event.repository.js';
import { SUBSCRIPTION_HISTORY_LIMIT, type Subscription } from '../../../domain/subscription.js';
import { SubscriptionRepository } from '../../../domain/subscription.repository.js';
import { grantsAccess } from '../../rules/subscription-access.rules.js';
import { canReuseCheckout, firstChargeDate, isTrialEligible, TRIAL_DAYS } from '../../rules/subscription-lifecycle.rules.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import type { CreateCheckoutInput } from './create-checkout.input.js';

export type CheckoutOutcome =
  | { kind: 'redirect'; checkoutUrl: string }
  | { kind: 'already_subscribed' }
  | { kind: 'in_progress' };

function paidUntil(history: Subscription[], now: Date): Date | null {
  const canceled = history.find((subscription) => subscription.status === 'canceled' && grantsAccess(subscription, now));
  return canceled?.currentPeriodEnd ?? null;
}

@Injectable()
export class CreateCheckoutUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly billingProviderRegistry: BillingProviderRegistry,
    private readonly billingEventRepository: BillingEventRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
  ) {}

  async execute(input: CreateCheckoutInput, now = new Date()): Promise<CheckoutOutcome> {
    const history = await this.subscriptionRepository.findHistory(input.userId, SUBSCRIPTION_HISTORY_LIMIT);

    const live = history.find((subscription) => subscription.status !== 'canceled');
    if (live) {
      const resolution = await this.resolveLiveSubscription(live, now);
      if (resolution !== 'abandoned') return resolution;
    }

    const trialDays = isTrialEligible(history) ? input.trialDays ?? TRIAL_DAYS : 0;
    const firstChargeAt = firstChargeDate({ now, trialDays, paidUntil: paidUntil(history, now) });

    const pending = await this.subscriptionRepository.createPending({
      userId: input.userId,
      planKey: input.planKey,
      amount: input.amount,
      currency: input.currency,
      interval: input.interval,
      provider: this.billingProviderRegistry.current().name,
      trialEndsAt: trialDays > 0 ? firstChargeAt : null,
    });
    if (pending === 'live_exists') return { kind: 'in_progress' };

    const checkoutUrl = await this.openProviderCheckout(pending, input, firstChargeAt);
    await this.billingEventRepository.record({
      source: 'user',
      type: 'checkout.started',
      userId: input.userId,
      subscriptionId: pending.id,
      data: { planKey: input.planKey, trial: pending.trialEndsAt !== null },
    });

    return { kind: 'redirect', checkoutUrl };
  }

  private async resolveLiveSubscription(live: Subscription, now: Date): Promise<CheckoutOutcome | 'abandoned'> {
    if (live.status !== 'pending') return { kind: 'already_subscribed' };
    if (!live.checkoutUrl) return { kind: 'in_progress' };
    if (canReuseCheckout(live, now)) return { kind: 'redirect', checkoutUrl: live.checkoutUrl };

    await this.subscriptionLifecycle.abandonPending(live, now);
    return 'abandoned';
  }

  private async openProviderCheckout(pending: Subscription, input: CreateCheckoutInput, firstChargeAt: Date): Promise<string> {
    try {
      const { externalId, checkoutUrl } = await this.billingProviderRegistry.get(pending.provider).createCheckout({
        subscriptionId: pending.id,
        reason: input.reason,
        payerEmail: input.payerEmail,
        amount: pending.amount,
        currency: pending.currency,
        interval: input.interval,
        firstChargeAt,
        returnUrl: input.returnUrl,
      });
      await this.subscriptionRepository.attachCheckout(pending.id, externalId, checkoutUrl);
      return checkoutUrl;
    } catch (error) {
      await this.subscriptionLifecycle.abandonPending(pending);
      throw error;
    }
  }
}
