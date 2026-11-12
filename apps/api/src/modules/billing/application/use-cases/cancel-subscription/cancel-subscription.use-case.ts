import { Injectable } from '@nestjs/common';
import type { BillingEventSource } from '../../../domain/billing.types.js';
import { SubscriptionRepository } from '../../../domain/subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
  ) {}

  async execute(userId: string, source: BillingEventSource = 'user'): Promise<boolean> {
    const live = await this.subscriptionRepository.findLive(userId);
    if (!live) return false;

    await this.subscriptionLifecycle.cancel(live, { source });
    return true;
  }
}
