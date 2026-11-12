import { describe, expect, it } from 'vitest';
import type { GmailConnectionData } from '../../../domain/gmail-connection/gmail-connection.js';
import { InMemoryGmailConnectionRepository } from '../../../infrastructure/gmail-connection/in-memory-gmail-connection.repository.js';
import { FakeGmailClient } from '../../../infrastructure/gmail/fake-gmail-client.js';
import { FakeTokenCipher } from '../../../infrastructure/fake-token-cipher.js';
import { createFakeLogger } from '../../../infrastructure/fake-logger.js';
import { GmailAccessService } from '../../services/gmail-access.service.js';
import { DisconnectGmailUseCase } from './disconnect-gmail.use-case.js';

const USER = 'user-1';
const connectionData: GmailConnectionData = { email: 'cesar@gmail.com', sealedRefreshToken: 'sealed', status: 'active', historyId: BigInt(1000), watchExpiresAt: new Date('2026-10-23') };

describe('DisconnectGmailUseCase', () => {
  it('removes the Gmail connection', async () => {
    const repository = new InMemoryGmailConnectionRepository();
    await repository.save(USER, connectionData);
    const access = new GmailAccessService(repository, new FakeGmailClient(), new FakeTokenCipher(), createFakeLogger());

    await new DisconnectGmailUseCase(access).execute(USER);

    expect(await repository.findByUser(USER)).toBeNull();
  });
});
