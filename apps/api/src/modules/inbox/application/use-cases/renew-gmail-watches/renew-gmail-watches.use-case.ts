import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../../shared/logger/domain/logger.js';
import type { GmailConnection } from '../../../domain/gmail-connection/gmail-connection.js';
import { GmailConnectionRepository } from '../../../domain/gmail-connection/gmail-connection.repository.js';
import { GmailClient } from '../../../domain/gmail-client.js';
import { GmailAccessService } from '../../services/gmail-access.service.js';
import { GmailSyncService } from '../../services/gmail-sync.service.js';

@Injectable()
export class RenewGmailWatchesUseCase {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailClient: GmailClient,
    private readonly gmailAccess: GmailAccessService,
    private readonly gmailSync: GmailSyncService,
    private readonly logger: Logger,
  ) {}

  async execute(): Promise<{ renewed: number; failed: number }> {
    const totals = { renewed: 0, failed: 0 };
    if (!this.gmailClient.isAvailable()) return totals;

    const connections = await this.gmailConnectionRepository.findActive();
    for (const connection of connections) {
      try {
        const renewed = await this.renewWatch(connection);
        if (renewed) totals.renewed++;
      } catch (error) {
        totals.failed++;
        this.logger.error({ userId: connection.userId, err: error }, 'inbox.gmail_renew_failed');
      }
    }

    return totals;
  }

  private async renewWatch(connection: GmailConnection): Promise<boolean> {
    const accessToken = await this.gmailAccess.accessTokenFor(connection);
    if (!accessToken) return false;

    const { watchExpiresAt } = await this.gmailClient.watch(accessToken);
    await this.gmailConnectionRepository.updateWatchExpiry(connection.id, watchExpiresAt);
    await this.gmailSync.syncWithAccessToken(connection, accessToken);
    return true;
  }
}
