import { describe, expect, it } from 'vitest';
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
import { RenewGmailWatchesUseCase } from './renew-gmail-watches.use-case.js';

const connectionData = (email: string): GmailConnectionData => ({ email, sealedRefreshToken: 'sealed', status: 'active', historyId: BigInt(1000), watchExpiresAt: new Date('2026-10-23') });

describe('RenewGmailWatchesUseCase', () => {
  it('counts failed renewals without stopping the rest', async () => {
    const gmailConnectionRepository = new InMemoryGmailConnectionRepository();
    await gmailConnectionRepository.save('user-a', connectionData('a@gmail.com'));
    await gmailConnectionRepository.save('user-b', connectionData('b@gmail.com'));

    const client = new FakeGmailClient();
    client.watch.mockRejectedValueOnce(new Error('quota')).mockResolvedValue({ historyId: BigInt(1), watchExpiresAt: new Date() });
    const access = new GmailAccessService(gmailConnectionRepository, client, new FakeTokenCipher(), createFakeLogger());
    const ingestion = new EmailIngestionService(
      new InMemoryInboxTransactionRepository(),
      new InMemoryInboxSenderRepository(),
      new InMemoryMerchantRuleRepository(),
      new FakeUserCalendar(),
    );
    const sync = new GmailSyncService(gmailConnectionRepository, new InMemoryInboxSenderRepository(), client, access, ingestion, createFakeLogger());
    const logger = createFakeLogger();

    const totals = await new RenewGmailWatchesUseCase(gmailConnectionRepository, client, access, sync, logger).execute();

    expect(totals).toEqual({ renewed: 1, failed: 1 });
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ userId: expect.stringMatching(/user-[ab]/) }), 'inbox.gmail_renew_failed');
  });

  it('does nothing when Gmail is not configured', async () => {
    const gmailConnectionRepository = new InMemoryGmailConnectionRepository();
    const client = new FakeGmailClient();
    client.isAvailable.mockReturnValue(false);
    const access = new GmailAccessService(gmailConnectionRepository, client, new FakeTokenCipher(), createFakeLogger());
    const ingestion = new EmailIngestionService(
      new InMemoryInboxTransactionRepository(),
      new InMemoryInboxSenderRepository(),
      new InMemoryMerchantRuleRepository(),
      new FakeUserCalendar(),
    );
    const sync = new GmailSyncService(gmailConnectionRepository, new InMemoryInboxSenderRepository(), client, access, ingestion, createFakeLogger());

    const totals = await new RenewGmailWatchesUseCase(gmailConnectionRepository, client, access, sync, createFakeLogger()).execute();

    expect(totals).toEqual({ renewed: 0, failed: 0 });
  });
});
