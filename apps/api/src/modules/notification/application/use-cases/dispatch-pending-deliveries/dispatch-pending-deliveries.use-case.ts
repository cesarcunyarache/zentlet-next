import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../../shared/logger/domain/logger.js';
import { NotificationChannelRegistry } from '../../../domain/notification-channel-registry.js';
import type { ClaimedDelivery } from '../../../domain/notification-delivery/notification-delivery.js';
import { NotificationDeliveryRepository } from '../../../domain/notification-delivery/notification-delivery.repository.js';
import { CLAIM_LEASE_MS, resolveDeliveryOutcome } from '../../rules/notification-retry.rules.js';
import type { DispatchPendingDeliveriesInput } from './dispatch-pending-deliveries.input.js';
import type { DispatchPendingDeliveriesOutput } from './dispatch-pending-deliveries.output.js';

const DEFAULT_BATCH = 50;

type DispatchResult = 'sent' | 'retried' | 'failed' | 'already-claimed';

@Injectable()
export class DispatchPendingDeliveriesUseCase {
  constructor(
    private readonly deliveryRepository: NotificationDeliveryRepository,
    private readonly channelRegistry: NotificationChannelRegistry,
    private readonly logger: Logger,
  ) {}

  async execute(input: DispatchPendingDeliveriesInput = {}): Promise<DispatchPendingDeliveriesOutput> {
    const dueIds = await this.deliveryRepository.findDueIds(new Date(), input.limit ?? DEFAULT_BATCH);

    const results = await Promise.all(dueIds.map((id) => this.dispatchOne(id)));

    return {
      processed: dueIds.length,
      sent: results.filter((result) => result === 'sent').length,
      retried: results.filter((result) => result === 'retried').length,
      failed: results.filter((result) => result === 'failed').length,
    };
  }

  private async dispatchOne(id: string): Promise<DispatchResult> {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS);

    const delivery = await this.deliveryRepository.claim(id, now, leaseUntil);
    const claimedByAnotherWorker = delivery === null;
    if (claimedByAnotherWorker) return 'already-claimed';

    if (!this.channelRegistry.isKnown(delivery.channel)) {
      // An unknown channel is a configuration defect, not a transient send
      // failure: surface it loudly and give up immediately, no retry.
      this.logger.error({ deliveryId: id, channel: delivery.channel }, 'notification.unknown_channel');
      await this.deliveryRepository.saveOutcome(id, { status: 'failed' });
      return 'failed';
    }

    const isSent = await this.send(delivery);
    const outcome = resolveDeliveryOutcome(isSent, delivery.attempts, now);
    await this.deliveryRepository.saveOutcome(id, outcome);

    if (isSent) return 'sent';
    this.logger.warn({ deliveryId: id, channel: delivery.channel, attempts: delivery.attempts }, 'notification.delivery_failed');
    return 'status' in outcome ? 'failed' : 'retried';
  }

  private async send(delivery: ClaimedDelivery): Promise<boolean> {
    const channel = this.channelRegistry.get(delivery.channel);
    try {
      return await channel.send(delivery.notification, delivery.recipient);
    } catch (error) {
      this.logger.error({ err: error, channel: delivery.channel }, 'notification.send_failed');
      return false;
    }
  }
}
