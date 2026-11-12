import { describe, expect, it, vi } from 'vitest';
import type { GmailConnectionData } from '../../../domain/gmail-connection/gmail-connection.js';
import { InMemoryGmailConnectionRepository } from '../../../infrastructure/gmail-connection/in-memory-gmail-connection.repository.js';
import { InMemoryInboxSenderRepository } from '../../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { InMemoryInboxTransactionRepository } from '../../../infrastructure/inbox-transaction/in-memory-inbox-transaction.repository.js';
import { InMemoryMerchantRuleRepository } from '../../../infrastructure/merchant-rule/in-memory-merchant-rule.repository.js';
import { FakeUserCalendar } from '../../../infrastructure/fake-user-calendar.js';
import { FakeGmailClient } from '../../../infrastructure/gmail/fake-gmail-client.js';
import { FakeTokenCipher } from '../../../infrastructure/fake-token-cipher.js';
import { createFakeLogger } from '../../../infrastructure/fake-logger.js';
import { EmailIngestionService } from '../../services/email-ingestion.service.js';
import { GmailAccessService } from '../../services/gmail-access.service.js';
import { GmailSyncService } from '../../services/gmail-sync.service.js';
import { SyncGmailPushUseCase } from './sync-gmail-push.use-case.js';

const USER = 'user-1';
const connectionData: GmailConnectionData = { email: 'cesar@gmail.com', sealedRefreshToken: 'sealed', status: 'active', historyId: BigInt(1000), watchExpiresAt: new Date('2026-10-23') };

function setup() {
  const gmailConnectionRepository = new InMemoryGmailConnectionRepository();
  const client = new FakeGmailClient();
  const access = new GmailAccessService(gmailConnectionRepository, client, new FakeTokenCipher(), createFakeLogger());
  const ingestion = new EmailIngestionService(
    new InMemoryInboxTransactionRepository(),
    new InMemoryInboxSenderRepository(),
    new InMemoryMerchantRuleRepository(),
    new FakeUserCalendar(),
  );
  const sync = new GmailSyncService(gmailConnectionRepository, new InMemoryInboxSenderRepository(), client, access, ingestion, createFakeLogger());
  return { gmailConnectionRepository, sync, useCase: new SyncGmailPushUseCase(gmailConnectionRepository, sync) };
}

describe('SyncGmailPushUseCase', () => {
  it('syncs the active connection for the notified mailbox', async () => {
    const { gmailConnectionRepository, sync, useCase } = setup();
    await gmailConnectionRepository.save(USER, connectionData);
    const syncSpy = vi.spyOn(sync, 'sync');

    expect(await useCase.execute('cesar@gmail.com')).toBe('synced');
    expect(syncSpy).toHaveBeenCalled();
  });

  it('an email with no connection or a revoked one is unknown', async () => {
    const { gmailConnectionRepository, sync, useCase } = setup();
    await gmailConnectionRepository.save(USER, { ...connectionData, status: 'active' });
    await gmailConnectionRepository.markRevoked((await gmailConnectionRepository.findByUser(USER))!.id);
    const syncSpy = vi.spyOn(sync, 'sync');

    expect(await useCase.execute('missing@gmail.com')).toBe('unknown');
    expect(await useCase.execute('cesar@gmail.com')).toBe('unknown');
    expect(syncSpy).not.toHaveBeenCalled();
  });
});
