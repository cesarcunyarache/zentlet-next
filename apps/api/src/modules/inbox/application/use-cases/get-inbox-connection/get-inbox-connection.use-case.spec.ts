import { describe, expect, it } from 'vitest';
import { InMemoryEmailInboxRepository } from '../../../infrastructure/email-inbox/in-memory-email-inbox.repository.js';
import { InMemoryGmailConnectionRepository } from '../../../infrastructure/gmail-connection/in-memory-gmail-connection.repository.js';
import { InMemoryInboxSenderRepository } from '../../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { FakeInboundMailbox } from '../../../infrastructure/fake-inbound-mailbox.js';
import { FakeGmailClient } from '../../../infrastructure/gmail/fake-gmail-client.js';
import { GetInboxConnectionUseCase } from './get-inbox-connection.use-case.js';

const USER = 'user-1';

describe('GetInboxConnectionUseCase', () => {
  it('only shows blocked or trusted senders, hiding unconfirmed ones', async () => {
    const inboxSenderRepository = new InMemoryInboxSenderRepository();
    const blocked = await inboxSenderRepository.trust(USER, 'blocked@shop.pe');
    await inboxSenderRepository.block(blocked.id);
    await inboxSenderRepository.trust(USER, 'manual@shop.pe');
    await inboxSenderRepository.recordDismissal(USER, 'unconfirmed@shop.pe');

    const useCase = new GetInboxConnectionUseCase(
      new InMemoryEmailInboxRepository(),
      inboxSenderRepository,
      new InMemoryGmailConnectionRepository(),
      new FakeInboundMailbox(),
      new FakeGmailClient(),
    );

    const connection = await useCase.execute(USER);

    expect(connection.visibleSenders.map((sender) => sender.address).sort()).toEqual(['blocked@shop.pe', 'manual@shop.pe']);
    expect(connection.isAvailable).toBe(true);
  });
});
