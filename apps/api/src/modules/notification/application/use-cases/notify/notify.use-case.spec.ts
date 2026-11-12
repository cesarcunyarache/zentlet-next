import { describe, expect, it } from 'vitest';
import { InMemoryNotificationDeliveryRepository } from '../../../infrastructure/notification-delivery/in-memory-notification-delivery.repository.js';
import { InMemoryNotificationRepository } from '../../../infrastructure/notification/in-memory-notification.repository.js';
import { NotifyUseCase } from './notify.use-case.js';

function setup() {
  const notifications = new InMemoryNotificationRepository();
  const deliveries = new InMemoryNotificationDeliveryRepository();
  const useCase = new NotifyUseCase(notifications, deliveries);
  return { notifications, deliveries, useCase };
}

const input = {
  userId: 'user-1',
  type: 'budget.exceeded',
  data: { budgetId: 'budget-1', spent: 120, limit: 100 },
  dedupeKey: 'budget.exceeded:budget-1:2026-09-01',
  channels: ['email'],
};

describe('NotifyUseCase', () => {
  it('creates the notification and one pending delivery per channel', async () => {
    const { useCase, notifications } = setup();

    const result = await useCase.execute(input);

    expect(result.status).toBe('created');
    if (result.status !== 'created') throw new Error('unexpected status');
    expect(result.deliveryIds).toHaveLength(1);
    expect(await notifications.findLatest('user-1', 10)).toMatchObject([
      { userId: 'user-1', type: 'budget.exceeded', dedupeKey: input.dedupeKey },
    ]);
  });

  it('creates the notification with no deliveries when no channel is requested', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ ...input, channels: [] });

    expect(result).toMatchObject({ status: 'created', deliveryIds: [] });
  });

  it('does not notify twice for the same user and dedupe key', async () => {
    const { useCase, deliveries } = setup();

    await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second).toEqual({ status: 'duplicate' });
    expect(await deliveries.findDueIds(new Date(), 10)).toHaveLength(1);
  });

  it('allows several notifications with no dedupe key for the same user', async () => {
    const { useCase, notifications } = setup();

    await useCase.execute({ ...input, dedupeKey: null });
    await useCase.execute({ ...input, dedupeKey: null });

    expect(await notifications.findLatest('user-1', 10)).toHaveLength(2);
  });
});
