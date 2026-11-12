import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../shared/logger/domain/logger.js';
import { isActiveConnection, type GmailConnection } from '../../domain/gmail-connection/gmail-connection.js';
import { GmailConnectionRepository } from '../../domain/gmail-connection/gmail-connection.repository.js';
import { GmailClient } from '../../domain/gmail-client.js';
import { TokenCipher } from '../../domain/token-cipher.js';

@Injectable()
export class GmailAccessService {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailClient: GmailClient,
    private readonly tokenCipher: TokenCipher,
    private readonly logger: Logger,
  ) {}

  async accessTokenFor(connection: GmailConnection): Promise<string | null> {
    const canUseGmail = this.gmailClient.isAvailable() && isActiveConnection(connection);
    if (!canUseGmail) return null;

    const refreshToken = this.tokenCipher.open(connection.sealedRefreshToken);
    const refreshed = await this.gmailClient.refreshAccessToken(refreshToken);
    if (refreshed !== 'revoked') return refreshed.accessToken;

    await this.gmailConnectionRepository.markRevoked(connection.id);
    this.logger.warn({ userId: connection.userId }, 'inbox.gmail_revoked');
    return null;
  }

  async disconnect(userId: string): Promise<void> {
    const connection = await this.gmailConnectionRepository.findByUser(userId);
    if (!connection) return;

    try {
      await this.releaseGoogleAccess(connection);
    } catch (error) {
      this.logger.warn({ userId, err: error }, 'inbox.gmail_disconnect_cleanup_failed');
    }

    await this.gmailConnectionRepository.deleteById(connection.id);
  }

  private async releaseGoogleAccess(connection: GmailConnection): Promise<void> {
    const accessToken = await this.accessTokenFor(connection);
    if (accessToken) await this.gmailClient.stopWatch(accessToken);
    await this.gmailClient.revokeToken(this.tokenCipher.open(connection.sealedRefreshToken));
  }
}
