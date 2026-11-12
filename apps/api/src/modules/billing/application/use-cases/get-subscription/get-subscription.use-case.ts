import { Injectable } from '@nestjs/common';
import type { Subscription } from '../../../domain/entities/subscription.js';
import { SubscriptionRepository } from '../../../domain/subscription.repository.js';
import { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';
import type { GetSubscriptionInput } from './get-subscription.input.js';

@Injectable()
export class GetSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
  ) {}

  async execute({ userId, sync = false }: GetSubscriptionInput): Promise<Subscription | null> {
    const live = await this.subscriptionRepository.findLive(userId);
    if (!live || !sync) return live;

    return this.subscriptionLifecycle.sync(live);
  }
}
