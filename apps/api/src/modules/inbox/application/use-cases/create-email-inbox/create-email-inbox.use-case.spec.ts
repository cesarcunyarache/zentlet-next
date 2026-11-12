import { describe, expect, it, vi } from 'vitest';
import { EmailInboxRepository } from '../../../domain/email-inbox/email-inbox.repository.js';
import { InMemoryEmailInboxRepository } from '../../../infrastructure/email-inbox/in-memory-email-inbox.repository.js';
import { FakeInboundMailbox } from '../../../infrastructure/fake-inbound-mailbox.js';
import { CreateEmailInboxUseCase } from './create-email-inbox.use-case.js';

class AlwaysConflictingEmailInboxRepository extends EmailInboxRepository {
  findByUser = vi.fn<EmailInboxRepository['findByUser']>().mockResolvedValue(null);
  findByAddresses = vi.fn<EmailInboxRepository['findByAddresses']>().mockResolvedValue(null);
  insert = vi.fn<EmailInboxRepository['insert']>().mockResolvedValue('conflict');
  recordReceipt = vi.fn<EmailInboxRepository['recordReceipt']>();
}

const USER = 'user-1';

describe('CreateEmailInboxUseCase', () => {
  it('without an inbound domain configured it is email_import_unavailable', async () => {
    const repository = new InMemoryEmailInboxRepository();

    expect(await new CreateEmailInboxUseCase(repository, new FakeInboundMailbox(null)).execute(USER)).toEqual({
      error: 'email_import_unavailable',
    });
  });

  it('allocates an address on the inbound domain', async () => {
    const repository = new InMemoryEmailInboxRepository();

    const result = await new CreateEmailInboxUseCase(repository, new FakeInboundMailbox()).execute(USER);

    expect(result).toMatchObject({ inbox: { userId: USER } });
    expect('inbox' in result && result.inbox.address).toMatch(/@in\.zentlet\.test$/);
  });

  it('returns the existing address instead of creating another one', async () => {
    const repository = new InMemoryEmailInboxRepository();
    const existing = await repository.insert(USER, 'a@in.zentlet.test');

    expect(await new CreateEmailInboxUseCase(repository, new FakeInboundMailbox()).execute(USER)).toEqual({ inbox: existing });
  });

  it('gives up after repeated address collisions', async () => {
    const repository = new AlwaysConflictingEmailInboxRepository();

    await expect(new CreateEmailInboxUseCase(repository, new FakeInboundMailbox()).execute(USER)).rejects.toThrow(
      'Could not allocate an inbox address',
    );
    expect(repository.insert).toHaveBeenCalledTimes(3);
  });
});
