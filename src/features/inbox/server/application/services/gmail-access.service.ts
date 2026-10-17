import { isActiveConnection, type GmailConnection } from "../../domain/entities/gmail-connection.entity";
import type { GmailGateway, InboxMonitor, TokenCipher } from "../../domain/ports/inbox.ports";
import type { GmailConnectionRepository } from "../../domain/repositories/gmail-connection.repository";

export class GmailAccessService {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailGateway: GmailGateway,
    private readonly tokenCipher: TokenCipher,
    private readonly inboxMonitor: InboxMonitor,
  ) {}

  async accessTokenFor(connection: GmailConnection) {
    const canUseGmail = this.gmailGateway.isAvailable() && isActiveConnection(connection);
    if (!canUseGmail) return null;

    const refreshToken = this.tokenCipher.open(connection.sealedRefreshToken);
    const accessToken = await this.gmailGateway.refreshAccessToken(refreshToken);
    if (accessToken !== "revoked") return accessToken;

    await this.gmailConnectionRepository.markRevoked(connection.id);
    this.inboxMonitor.warn("inbox.gmail_revoked", { userId: connection.userId });
    return null;
  }

  async disconnect(userId: string) {
    const connection = await this.gmailConnectionRepository.findByUser(userId);
    if (!connection) return;

    try {
      await this.releaseGoogleAccess(connection);
    } catch (error) {
      this.inboxMonitor.warn("inbox.gmail_disconnect_cleanup_failed", { userId, err: error });
    }

    await this.gmailConnectionRepository.deleteById(connection.id);
  }

  private async releaseGoogleAccess(connection: GmailConnection) {
    const accessToken = await this.accessTokenFor(connection);
    if (accessToken) await this.gmailGateway.stopWatch(accessToken);
    await this.gmailGateway.revokeToken(this.tokenCipher.open(connection.sealedRefreshToken));
  }
}
