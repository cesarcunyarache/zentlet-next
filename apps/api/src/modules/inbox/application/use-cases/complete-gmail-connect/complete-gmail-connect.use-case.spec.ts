import { describe, expect, it } from 'vitest';
import { InMemoryGmailConnectionRepository } from '../../../infrastructure/gmail-connection/in-memory-gmail-connection.repository.js';
import { FakeGmailClient } from '../../../infrastructure/gmail/fake-gmail-client.js';
import { FakeTokenCipher } from '../../../infrastructure/fake-token-cipher.js';
import { createFakeLogger } from '../../../infrastructure/fake-logger.js';
import { GmailAccessService } from '../../services/gmail-access.service.js';
import { CompleteGmailConnectUseCase } from './complete-gmail-connect.use-case.js';

const USER = 'user-1';

function connect(repository: InMemoryGmailConnectionRepository, client = new FakeGmailClient()) {
  const access = new GmailAccessService(repository, client, new FakeTokenCipher(), createFakeLogger());
  return new CompleteGmailConnectUseCase(repository, client, access, new FakeTokenCipher(), createFakeLogger()).execute(USER, 'code-1');
}

describe('CompleteGmailConnectUseCase', () => {
  it('saves the account with the sealed token and an active watch', async () => {
    const repository = new InMemoryGmailConnectionRepository();

    expect(await connect(repository)).toBe('connected');
    const saved = await repository.findByUser(USER);
    expect(saved).toMatchObject({ email: 'cesar@gmail.com', sealedRefreshToken: 'sealed:refresh-1', status: 'active', historyId: BigInt(1000) });
  });

  it('without Gmail configured it is unavailable', async () => {
    const client = new FakeGmailClient();
    client.isAvailable.mockReturnValue(false);

    expect(await connect(new InMemoryGmailConnectionRepository(), client)).toBe('unavailable');
    expect(client.exchangeCode).not.toHaveBeenCalled();
  });

  it('without inbox read permission it is scope_denied', async () => {
    const client = new FakeGmailClient();
    client.exchangeCode.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', canReadInbox: false });

    expect(await connect(new InMemoryGmailConnectionRepository(), client)).toBe('scope_denied');
  });

  it('an account already connected by another user is taken', async () => {
    const repository = new InMemoryGmailConnectionRepository();
    await repository.save('user-2', { email: 'cesar@gmail.com', sealedRefreshToken: 'sealed', status: 'active', historyId: BigInt(1), watchExpiresAt: new Date('2026-10-23') });

    expect(await connect(repository)).toBe('taken');
    expect(await repository.findByUser(USER)).toBeNull();
  });

  it('switching accounts disconnects the previous one', async () => {
    const repository = new InMemoryGmailConnectionRepository();
    await repository.save(USER, { email: 'old@gmail.com', sealedRefreshToken: 'sealed', status: 'active', historyId: BigInt(1), watchExpiresAt: new Date('2026-10-23') });

    expect(await connect(repository)).toBe('connected');
    expect(await repository.findByUser(USER)).toMatchObject({ email: 'cesar@gmail.com' });
  });
});
