import { describe, expect, it } from 'vitest';
import { InMemoryNotificationRepository } from '../../../infrastructure/notification/in-memory-notification.repository.js';
import { ListNotificationsUseCase } from './list-notifications.use-case.js';

describe('ListNotificationsUseCase', () => {
  it('returns the latest notifications for the user together with the unread count', async () => {
    const notifications = new InMemoryNotificationRepository();
    await notifications.create({ userId: 'user-1', type: 'budget.exceeded', data: {}, dedupeKey: 'a' });
    await notifications.create({ userId: 'user-1', type: 'budget.exceeded', data: {}, dedupeKey: 'b' });
    await notifications.create({ userId: 'user-2', type: 'budget.exceeded', data: {}, dedupeKey: 'c' });
    const useCase = new ListNotificationsUseCase(notifications);

    const feed = await useCase.execute({ userId: 'user-1' });

    expect(feed.items).toHaveLength(2);
    expect(feed.unreadCount).toBe(2);
  });

  it('respects a custom limit', async () => {
    const notifications = new InMemoryNotificationRepository();
    await notifications.create({ userId: 'user-1', type: 'budget.exceeded', data: {}, dedupeKey: 'a' });
    await notifications.create({ userId: 'user-1', type: 'budget.exceeded', data: {}, dedupeKey: 'b' });
    const useCase = new ListNotificationsUseCase(notifications);

    const feed = await useCase.execute({ userId: 'user-1', limit: 1 });

    expect(feed.items).toHaveLength(1);
  });
});
