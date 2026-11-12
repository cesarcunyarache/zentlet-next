import { describe, expect, it } from 'vitest';
import { InMemoryNotificationRepository } from '../../../infrastructure/notification/in-memory-notification.repository.js';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case.js';

describe('MarkNotificationReadUseCase', () => {
  it('marks every unread notification of a user as read, leaving other users untouched', async () => {
    const notifications = new InMemoryNotificationRepository();
    await notifications.create({ userId: 'user-1', type: 'budget.exceeded', data: {}, dedupeKey: 'a' });
    await notifications.create({ userId: 'user-1', type: 'budget.exceeded', data: {}, dedupeKey: 'b' });
    await notifications.create({ userId: 'user-2', type: 'budget.exceeded', data: {}, dedupeKey: 'c' });
    const useCase = new MarkNotificationReadUseCase(notifications);

    await useCase.execute({ userId: 'user-1' });

    expect(await notifications.countUnread('user-1')).toBe(0);
    expect(await notifications.countUnread('user-2')).toBe(1);
  });
});
