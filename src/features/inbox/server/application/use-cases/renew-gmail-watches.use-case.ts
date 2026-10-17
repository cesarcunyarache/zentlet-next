import type { GmailConnection } from "../../domain/entities/gmail-connection.entity";
import type { GmailGateway, InboxMonitor } from "../../domain/ports/inbox.ports";
import type { GmailConnectionRepository } from "../../domain/repositories/gmail-connection.repository";
import type { GmailAccessService } from "../services/gmail-access.service";
import type { GmailSyncService } from "../services/gmail-sync.service";

export class RenewGmailWatchesUseCase {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailGateway: GmailGateway,
    private readonly gmailAccess: GmailAccessService,
    private readonly gmailSync: GmailSyncService,
    private readonly inboxMonitor: InboxMonitor,
  ) {}

  async execute() {
    const totals = { renewed: 0, failed: 0 };
    if (!this.gmailGateway.isAvailable()) return totals;

    const connections = await this.gmailConnectionRepository.findActive();
    for (const connection of connections) {
      try {
        const renewed = await this.renewWatch(connection);
        if (renewed) totals.renewed++;
      } catch (error) {
        totals.failed++;
        this.inboxMonitor.error("inbox.gmail_renew_failed", { userId: connection.userId, err: error });
      }
    }

    return totals;
  }

  private async renewWatch(connection: GmailConnection) {
    const accessToken = await this.gmailAccess.accessTokenFor(connection);
    if (!accessToken) return false;

    const { watchExpiresAt } = await this.gmailGateway.watch(accessToken);
    await this.gmailConnectionRepository.updateWatchExpiry(connection.id, watchExpiresAt);
    await this.gmailSync.syncWithAccessToken(connection, accessToken);
    return true;
  }
}
