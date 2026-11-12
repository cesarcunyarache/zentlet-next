import { describe, expect, it } from 'vitest';
import { InMemoryInboxSenderRepository } from '../../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { TrustInboxSenderUseCase } from './trust-inbox-sender.use-case.js';

const USER = 'user-1';

describe('TrustInboxSenderUseCase', () => {
  it('trusts a normalized address or a whole domain', async () => {
    const repository = new InMemoryInboxSenderRepository();
    const useCase = new TrustInboxSenderUseCase(repository);

    await useCase.execute(USER, '  Alerts@Shop.PE ');
    await useCase.execute(USER, 'shop.pe');

    const senders = await repository.findAll(USER);
    expect(senders.map((sender) => sender.address)).toEqual(['alerts@shop.pe', '@shop.pe']);
    expect(senders.every((sender) => sender.origin === 'manual')).toBe(true);
  });

  it('something that is neither an email nor a domain is invalid_sender', async () => {
    const repository = new InMemoryInboxSenderRepository();

    expect(await new TrustInboxSenderUseCase(repository).execute(USER, 'no es correo')).toEqual({ error: 'invalid_sender' });
    expect(await repository.findAll(USER)).toHaveLength(0);
  });
});
