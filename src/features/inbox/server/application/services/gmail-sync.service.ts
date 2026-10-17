import { fromGmailMessage, gmailHeader, isIncomingMessage } from "../../../lib/gmail-message";
import { normalizeAddress, senderVerdict } from "../../../lib/sender";
import type { SenderVerdict } from "../../../types";
import type { GmailConnection } from "../../domain/entities/gmail-connection.entity";
import type { GmailGateway, InboxMonitor } from "../../domain/ports/inbox.ports";
import type { GmailConnectionRepository } from "../../domain/repositories/gmail-connection.repository";
import type { InboxSenderRepository } from "../../domain/repositories/inbox-sender.repository";
import type { EmailIngestionService } from "./email-ingestion.service";
import type { GmailAccessService } from "./gmail-access.service";

export type GmailSyncOutcome = "synced" | "reset" | "revoked" | "not_allowed";

interface NewMessages {
  ids: string[];
  latestHistoryId: string;
}

interface SyncContext {
  accessToken: string;
  userId: string;
  isWatched: (from: string) => boolean;
}

const MAX_HISTORY_PAGES = 5;
const MAX_MESSAGES_PER_SYNC = 50;
const WATCHED_VERDICTS = new Set<SenderVerdict>(["known", "trusted"]);

export class GmailSyncService {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
    private readonly gmailGateway: GmailGateway,
    private readonly gmailAccess: GmailAccessService,
    private readonly emailIngestion: EmailIngestionService,
    private readonly inboxMonitor: InboxMonitor,
  ) {}

  async sync(connection: GmailConnection): Promise<GmailSyncOutcome> {
    const accessToken = await this.gmailAccess.accessTokenFor(connection);
    if (!accessToken) return "revoked";
    return this.syncWithAccessToken(connection, accessToken);
  }

  async syncWithAccessToken(connection: GmailConnection, accessToken: string): Promise<GmailSyncOutcome> {
    const { id, userId, historyId } = connection;
    if (historyId === null) return this.resetHistory(id, accessToken);

    const found = await this.findNewMessages(accessToken, historyId.toString());
    if (!found) return this.resetHistory(id, accessToken);

    const context: SyncContext = { accessToken, userId, isWatched: await this.watchedSenderFilter(userId) };
    let created = 0;
    for (const messageId of found.ids) {
      const outcome = await this.ingestMessage(context, messageId);
      if (outcome === "created") created++;
    }

    await this.saveProgress(id, found.latestHistoryId);
    this.inboxMonitor.info("inbox.gmail_synced", { userId, messages: found.ids.length, created });
    return "synced";
  }

  private async saveProgress(connectionId: string, historyId: string) {
    await this.gmailConnectionRepository.saveProgress(connectionId, BigInt(historyId));
  }

  private async resetHistory(connectionId: string, accessToken: string) {
    const profile = await this.gmailGateway.getProfile(accessToken);
    await this.saveProgress(connectionId, profile.historyId);
    return "reset" as const;
  }

  private async findNewMessages(accessToken: string, startHistoryId: string): Promise<NewMessages | null> {
    const ids = new Set<string>();
    let latestHistoryId = startHistoryId;
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
      const history = await this.gmailGateway.listHistory(accessToken, startHistoryId, pageToken);
      if (history === "expired") return null;

      latestHistoryId = history.historyId ?? latestHistoryId;
      const added = (history.history ?? []).flatMap((entry) => entry.messagesAdded ?? []);
      for (const { message } of added) {
        if (isIncomingMessage(message.labelIds)) ids.add(message.id);
      }

      pageToken = history.nextPageToken;
      if (!pageToken) break;
    }

    return { ids: [...ids].slice(0, MAX_MESSAGES_PER_SYNC), latestHistoryId };
  }

  private async watchedSenderFilter(userId: string) {
    const rules = await this.inboxSenderRepository.findRules(userId);
    return (from: string) => Boolean(from) && WATCHED_VERDICTS.has(senderVerdict(from, rules));
  }

  private async ingestMessage({ accessToken, userId, isWatched }: SyncContext, id: string) {
    const metadata = await this.gmailGateway.getMessageSender(accessToken, id);
    if (!metadata) return "skipped";

    const from = normalizeAddress(gmailHeader(metadata, "From"));
    if (!isWatched(from)) return "skipped";

    const message = await this.gmailGateway.getMessage(accessToken, id);
    if (!message) return "skipped";

    return this.emailIngestion.ingest(userId, fromGmailMessage(message));
  }
}
