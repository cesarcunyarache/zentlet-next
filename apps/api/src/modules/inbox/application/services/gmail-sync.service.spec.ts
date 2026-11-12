import { describe, expect, it } from 'vitest';
import type { GmailMessage } from '../../domain/gmail-client.js';
import type { GmailConnection, GmailConnectionData } from '../../domain/gmail-connection/gmail-connection.js';
import { InMemoryGmailConnectionRepository } from '../../infrastructure/gmail-connection/in-memory-gmail-connection.repository.js';
import { InMemoryInboxSenderRepository } from '../../infrastructure/inbox-sender/in-memory-inbox-sender.repository.js';
import { InMemoryInboxTransactionRepository } from '../../infrastructure/inbox-transaction/in-memory-inbox-transaction.repository.js';
import { InMemoryMerchantRuleRepository } from '../../infrastructure/merchant-rule/in-memory-merchant-rule.repository.js';
import { FakeUserCalendar } from '../../infrastructure/fake-user-calendar.js';
import { FakeGmailClient } from '../../infrastructure/gmail/fake-gmail-client.js';
import { FakeTokenCipher } from '../../infrastructure/fake-token-cipher.js';
import { createFakeLogger } from '../../infrastructure/fake-logger.js';
import { EmailIngestionService } from './email-ingestion.service.js';
import { GmailAccessService } from './gmail-access.service.js';
import { GmailSyncService } from './gmail-sync.service.js';

const USER = 'user-1';
const BANK_SENDER = 'BCP <notificaciones@notificacionesbcp.com.pe>';
const connectionData: GmailConnectionData = { email: 'cesar@gmail.com', sealedRefreshToken: 'sealed', status: 'active', historyId: BigInt(1000), watchExpiresAt: new Date('2026-10-23') };

const gmailConnection = (overrides: Partial<GmailConnection> = {}): GmailConnection => ({
  id: 'gmail-1',
  userId: USER,
  email: 'cesar@gmail.com',
  sealedRefreshToken: 'sealed',
  status: 'active',
  historyId: BigInt(1000),
  watchExpiresAt: new Date('2026-10-23'),
  lastSyncedAt: null,
  ...overrides,
});

const metadataFrom = (from: string): GmailMessage => ({ id: 'm1', payload: { headers: [{ name: 'From', value: from }] } });

function setup() {
  const gmailConnectionRepository = new InMemoryGmailConnectionRepository();
  const inboxSenderRepository = new InMemoryInboxSenderRepository();
  const client = new FakeGmailClient();
  const access = new GmailAccessService(gmailConnectionRepository, client, new FakeTokenCipher(), createFakeLogger());
  const ingestion = new EmailIngestionService(
    new InMemoryInboxTransactionRepository(),
    inboxSenderRepository,
    new InMemoryMerchantRuleRepository(),
    new FakeUserCalendar(),
  );
  const sync = new GmailSyncService(gmailConnectionRepository, inboxSenderRepository, client, access, ingestion, createFakeLogger());
  return { gmailConnectionRepository, inboxSenderRepository, client, sync };
}

function withNewMessage(client: FakeGmailClient, from: string) {
  client.listHistory.mockResolvedValue({ historyId: '1100', history: [{ messagesAdded: [{ message: { id: 'm1', labelIds: ['INBOX'] } }] }] });
  client.getMessageSender.mockResolvedValue(metadataFrom(from));
  client.getMessage.mockResolvedValue(metadataFrom(from));
}

describe('GmailSyncService', () => {
  it('ingests new emails from known banks and saves progress', async () => {
    const { gmailConnectionRepository, client, sync } = setup();
    await gmailConnectionRepository.save(USER, connectionData);
    const [connection] = await gmailConnectionRepository.findActive();
    withNewMessage(client, BANK_SENDER);

    expect(await sync.sync(connection)).toBe('synced');
    expect((await gmailConnectionRepository.findByUser(USER))?.historyId).toBe(BigInt(1100));
  });

  it('a first-time (not yet trusted) sender is never watched, so its emails are skipped', async () => {
    const { gmailConnectionRepository, client, sync } = setup();
    await gmailConnectionRepository.save(USER, connectionData);
    const [connection] = await gmailConnectionRepository.findActive();
    withNewMessage(client, 'promo@shop.pe');

    await sync.sync(connection);

    expect(client.getMessage).not.toHaveBeenCalled();
  });

  it('a sender dismissed before ever being trusted stays unwatched', async () => {
    const { gmailConnectionRepository, inboxSenderRepository, client, sync } = setup();
    await gmailConnectionRepository.save(USER, connectionData);
    const [connection] = await gmailConnectionRepository.findActive();
    await inboxSenderRepository.recordDismissal(USER, 'promo@shop.pe');
    withNewMessage(client, 'promo@shop.pe');

    await sync.sync(connection);

    expect(client.getMessage).not.toHaveBeenCalled();
  });

  it('an accepted sender becomes trusted and gets watched on the next sync', async () => {
    const { gmailConnectionRepository, inboxSenderRepository, client, sync } = setup();
    await gmailConnectionRepository.save(USER, connectionData);
    const [connection] = await gmailConnectionRepository.findActive();
    await inboxSenderRepository.recordAcceptance(USER, 'promo@shop.pe');
    withNewMessage(client, 'promo@shop.pe');

    await sync.sync(connection);

    expect(client.getMessage).toHaveBeenCalled();
  });

  it('an expired history resets from the profile', async () => {
    const { gmailConnectionRepository, client, sync } = setup();
    await gmailConnectionRepository.save(USER, { ...connectionData, historyId: BigInt(500) });
    const [connection] = await gmailConnectionRepository.findActive();
    client.listHistory.mockResolvedValue('expired');

    expect(await sync.sync(connection)).toBe('reset');
    expect((await gmailConnectionRepository.findByUser(USER))?.historyId).toBe(BigInt(900));
  });

  it('no prior history resets without reading any message', async () => {
    const { gmailConnectionRepository, client, sync } = setup();
    const connection = gmailConnection({ historyId: null });
    gmailConnectionRepository.seed(connection);

    expect(await sync.sync(connection)).toBe('reset');
    expect(client.listHistory).not.toHaveBeenCalled();
  });

  it('a revoked connection never syncs', async () => {
    const { client, sync } = setup();

    expect(await sync.sync(gmailConnection({ status: 'revoked' }))).toBe('revoked');
    expect(client.refreshAccessToken).not.toHaveBeenCalled();
  });
});
