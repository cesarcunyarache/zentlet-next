import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_ATTEMPTS } from '../../rules/notification-retry.rules.js';
import { FakeLogger } from '../../../infrastructure/fake-logger.js';
import { FakeNotificationChannel } from '../../../infrastructure/notification-channel/fake-notification-channel.js';
import { FakeNotificationChannelRegistry } from '../../../infrastructure/notification-channel/fake-notification-channel-registry.js';
import { InMemoryNotificationDeliveryRepository } from '../../../infrastructure/notification-delivery/in-memory-notification-delivery.repository.js';
import type { Notification } from '../../../domain/notification/notification.js';
import { DispatchPendingDeliveriesUseCase } from './dispatch-pending-deliveries.use-case.js';

const NOW = new Date('2026-09-30T12:00:00.000Z');

const notification: Notification = {
  id: 'notification-1',
  userId: 'user-1',
  type: 'budget.exceeded',
  data: { budgetId: 'budget-1' },
  dedupeKey: 'budget.exceeded:budget-1',
  readAt: null,
  createdAt: NOW,
};

beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

function setup() {
  const deliveries = new InMemoryNotificationDeliveryRepository();
  deliveries.registerNotification(notification);
  const emailChannel = new FakeNotificationChannel('email');
  const registry = new FakeNotificationChannelRegistry();
  registry.register(emailChannel);
  const logger = new FakeLogger();
  const useCase = new DispatchPendingDeliveriesUseCase(deliveries, registry, logger);
  return { deliveries, emailChannel, registry, logger, useCase };
}

describe('DispatchPendingDeliveriesUseCase', () => {
  it('sends a due delivery through its channel and marks it sent', async () => {
    const { deliveries, emailChannel, useCase } = setup();
    const [id] = await deliveries.createPending('notification-1', ['email']);

    const result = await useCase.execute();

    expect(emailChannel.send).toHaveBeenCalledWith(notification, { email: 'user@example.com', name: 'Test User' });
    expect(result).toEqual({ processed: 1, sent: 1, retried: 0, failed: 0 });
    expect(await deliveries.findDueIds(NOW, 10)).not.toContain(id);
  });

  it('schedules a retry 5 minutes later after a single failed attempt', async () => {
    const { deliveries, emailChannel, useCase } = setup();
    const [id] = await deliveries.createPending('notification-1', ['email']);
    emailChannel.send.mockResolvedValueOnce(false);

    const result = await useCase.execute();

    expect(result).toEqual({ processed: 1, sent: 0, retried: 1, failed: 0 });
    const almostDue = new Date(NOW.getTime() + 5 * 60_000 - 1);
    expect(await deliveries.findDueIds(almostDue, 10)).not.toContain(id);
    const due = new Date(NOW.getTime() + 5 * 60_000);
    expect(await deliveries.findDueIds(due, 10)).toContain(id);
  });

  it('logs the failure and reports it as retried while attempts remain', async () => {
    const { deliveries, emailChannel, logger, useCase } = setup();
    await deliveries.createPending('notification-1', ['email']);
    emailChannel.send.mockRejectedValueOnce(new Error('smtp down'));
    const errorSpy = vi.spyOn(logger, 'error');
    const warnSpy = vi.spyOn(logger, 'warn');

    await useCase.execute();

    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ channel: 'email' }), 'notification.send_failed');
    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ channel: 'email', attempts: 1 }), 'notification.delivery_failed');
  });

  it('gives up without retrying once attempts are exhausted', async () => {
    const { deliveries, emailChannel, useCase } = setup();
    const [id] = await deliveries.createPending('notification-1', ['email']);
    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
      await deliveries.claim(id, NOW, NOW);
      await deliveries.saveOutcome(id, { nextAttemptAt: NOW });
    }
    emailChannel.send.mockResolvedValue(false);

    const result = await useCase.execute();

    expect(result).toEqual({ processed: 1, sent: 0, retried: 0, failed: 1 });
  });

  it('fails an unknown channel immediately without retrying and without calling send', async () => {
    const { deliveries, emailChannel, logger, useCase } = setup();
    await deliveries.createPending('notification-1', ['sms']);
    const errorSpy = vi.spyOn(logger, 'error');

    const result = await useCase.execute();

    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ channel: 'sms' }), 'notification.unknown_channel');
    expect(result).toEqual({ processed: 1, sent: 0, retried: 0, failed: 1 });
  });

  it('skips a delivery already claimed by another worker', async () => {
    const { deliveries, emailChannel, useCase } = setup();
    const [id] = await deliveries.createPending('notification-1', ['email']);
    await deliveries.claim(id, NOW, new Date(NOW.getTime() + 60_000));

    const result = await useCase.execute();

    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, sent: 0, retried: 0, failed: 0 });
  });
});
