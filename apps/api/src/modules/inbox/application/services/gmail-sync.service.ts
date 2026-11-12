import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../shared/logger/domain/logger.js';
import type { GmailConnection } from '../../domain/gmail-connection/gmail-connection.js';
import { GmailConnectionRepository } from '../../domain/gmail-connection/gmail-connection.repository.js';
import { GmailClient } from '../../domain/gmail-client.js';
import { InboxSenderRepository } from '../../domain/inbox-sender/inbox-sender.repository.js';
import type { SenderVerdict } from '../../domain/inbox-sender/inbox-sender.js';
import { fromGmailMessage, gmailHeader, isIncomingMessage } from '../parsing/gmail-message.js';
import { normalizeAddress, senderVerdict } from '../parsing/sender.js';
import { EmailIngestionService } from './email-ingestion.service.js';
import { GmailAccessService } from './gmail-access.service.js';

export type GmailSyncOutcome = 'synced' | 'reset' | 'revoked' | 'not_allowed';

type NewMessages = {
  ids: string[];
  latestHistoryId: string;
};

type SyncContext = {
  accessToken: string;
  userId: string;
  isWatched: (from: string) => boolean;
};

const MAX_HISTORY_PAGES = 5;
const MAX_MESSAGES_PER_SYNC = 50;
const WATCHED_VERDICTS = new Set<SenderVerdict>(['known', 'trusted']);

// Sync is push-driven (Gmail watch + Pub/Sub, not polling): a future webhook
// controller calls SyncGmailPushUseCase per notified mailbox, and a cron
// calls RenewGmailWatchesUseCase to keep each watch alive and catch up.
@Injectable()
export class GmailSyncService {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
    private readonly gmailClient: GmailClient,
    private readonly gmailAccess: GmailAccessService,
    private readonly emailIngestion: EmailIngestionService,
    private readonly logger: Logger,
  ) {}

  async sync(connection: GmailConnection): Promise<GmailSyncOutcome> {
    const accessToken = await this.gmailAccess.accessTokenFor(connection);
    if (!accessToken) return 'revoked';
    return this.syncWithAccessToken(connection, accessToken);
  }

  async syncWithAccessToken(connection: GmailConnection, accessToken: string): Promise<GmailSyncOutcome> {
    const { id, userId, historyId } = connection;
    const neverSynced = historyId === null;
    if (neverSynced) return this.resetHistory(id, accessToken);

    const newMessages = await this.findNewMessages(accessToken, historyId.toString());
    const historyExpired = newMessages === null;
    if (historyExpired) return this.resetHistory(id, accessToken);

    const isWatched = await this.watchedSenderFilter(userId);
    const context: SyncContext = { accessToken, userId, isWatched };

    let created = 0;
    for (const messageId of newMessages.ids) {
      const outcome = await this.ingestMessage(context, messageId);
      if (outcome === 'created') created++;
    }

    await this.saveProgress(id, newMessages.latestHistoryId);
    this.logger.info({ userId, messages: newMessages.ids.length, created }, 'inbox.gmail_synced');
    return 'synced';
  }

  private async saveProgress(connectionId: string, historyId: string): Promise<void> {
    await this.gmailConnectionRepository.saveProgress(connectionId, BigInt(historyId));
  }

  private async resetHistory(connectionId: string, accessToken: string): Promise<GmailSyncOutcome> {
    const profile = await this.gmailClient.getProfile(accessToken);
    await this.saveProgress(connectionId, profile.historyId);
    return 'reset';
  }

  private async findNewMessages(accessToken: string, startHistoryId: string): Promise<NewMessages | null> {
    const ids = new Set<string>();
    let latestHistoryId = startHistoryId;
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
      const history = await this.gmailClient.listHistory(accessToken, startHistoryId, pageToken);
      if (history === 'expired') return null;

      latestHistoryId = history.historyId ?? latestHistoryId;
      const entries = history.history ?? [];
      const added = entries.flatMap((entry) => entry.messagesAdded ?? []);
      for (const { message } of added) {
        if (isIncomingMessage(message.labelIds)) ids.add(message.id);
      }

      pageToken = history.nextPageToken;
      if (!pageToken) break;
    }

    return { ids: [...ids].slice(0, MAX_MESSAGES_PER_SYNC), latestHistoryId };
  }

  private async watchedSenderFilter(userId: string): Promise<(from: string) => boolean> {
    const rules = await this.inboxSenderRepository.findRules(userId);
    return (from: string) => Boolean(from) && WATCHED_VERDICTS.has(senderVerdict(from, rules));
  }

  private async ingestMessage({ accessToken, userId, isWatched }: SyncContext, id: string) {
    const metadata = await this.gmailClient.getMessageSender(accessToken, id);
    if (!metadata) return 'skipped';

    const from = normalizeAddress(gmailHeader(metadata, 'From'));
    if (!isWatched(from)) return 'skipped';

    const message = await this.gmailClient.getMessage(accessToken, id);
    if (!message) return 'skipped';

    return this.emailIngestion.ingest(userId, fromGmailMessage(message));
  }
}
