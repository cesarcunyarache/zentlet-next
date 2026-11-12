import { describe, expect, it } from 'vitest';
import type { GmailConnectionData } from '../../domain/gmail-connection/gmail-connection.js';
import { InMemoryGmailConnectionRepository } from '../../infrastructure/gmail-connection/in-memory-gmail-connection.repository.js';
import { FakeGmailClient } from '../../infrastructure/gmail/fake-gmail-client.js';
import { FakeTokenCipher } from '../../infrastructure/fake-token-cipher.js';
import { createFakeLogger } from '../../infrastructure/fake-logger.js';
import { GmailAccessService } from './gmail-access.service.js';

const USER = 'user-1';
const connectionData: GmailConnectionData = {
  email: 'cesar@gmail.com',
  sealedRefreshToken: 'sealed-refresh',
  status: 'active',
  historyId: BigInt(1000),
  watchExpiresAt: new Date('2026-10-23'),
};

describe('GmailAccessService', () => {
  it('a revoked refresh token marks the connection and returns no access', async () => {
    const repository = new InMemoryGmailConnectionRepository();
    await repository.save(USER, connectionData);
    const [connection] = await repository.findActive();
    const client = new FakeGmailClient();
    client.refreshAccessToken.mockResolvedValue('revoked');

    const service = new GmailAccessService(repository, client, new FakeTokenCipher(), createFakeLogger());

    expect(await service.accessTokenFor(connection)).toBeNull();
    expect(client.refreshAccessToken).toHaveBeenCalledWith('open:sealed-refresh');
    expect(await repository.findByUser(USER)).toMatchObject({ status: 'revoked' });
  });

  it('still deletes the connection even when Google cleanup fails', async () => {
    const repository = new InMemoryGmailConnectionRepository();
    await repository.save(USER, connectionData);
    const client = new FakeGmailClient();
    client.revokeToken.mockRejectedValue(new Error('network'));
    const logger = createFakeLogger();

    await new GmailAccessService(repository, client, new FakeTokenCipher(), logger).disconnect(USER);

    expect(logger.warn).toHaveBeenCalledWith(expect.anything(), 'inbox.gmail_disconnect_cleanup_failed');
    expect(await repository.findByUser(USER)).toBeNull();
  });
});
