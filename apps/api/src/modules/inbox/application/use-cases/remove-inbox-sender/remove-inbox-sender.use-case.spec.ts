import { describe, expect, it } from 'vitest';
import { InMemoryInboxSenderRepository } from '../../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { RemoveInboxSenderUseCase } from './remove-inbox-sender.use-case.js';

const USER = 'user-1';

describe('RemoveInboxSenderUseCase', () => {
  it('removes a sender owned by the user', async () => {
    const repository = new InMemoryInboxSenderRepository();
    const sender = await repository.trust(USER, 'alerts@shop.pe');

    expect(await new RemoveInboxSenderUseCase(repository).execute(USER, sender.id)).toEqual({ ok: true });
    expect(await repository.findAll(USER)).toHaveLength(0);
  });

  it('removing someone else\'s or a missing sender is sender_not_found', async () => {
    const repository = new InMemoryInboxSenderRepository();

    expect(await new RemoveInboxSenderUseCase(repository).execute(USER, 'missing')).toEqual({ error: 'sender_not_found' });
  });
});
