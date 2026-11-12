import { Injectable } from '@nestjs/common';
import { Logger } from '../../../../../shared/logger/domain/logger.js';
import { GmailConnectionRepository } from '../../../domain/gmail-connection/gmail-connection.repository.js';
import { GmailClient } from '../../../domain/gmail-client.js';
import { TokenCipher } from '../../../domain/token-cipher.js';
import { GmailAccessService } from '../../services/gmail-access.service.js';

export type GmailConnectResult = 'connected' | 'cancelled' | 'scope_denied' | 'taken' | 'unavailable' | 'error';

@Injectable()
export class CompleteGmailConnectUseCase {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailClient: GmailClient,
    private readonly gmailAccess: GmailAccessService,
    private readonly tokenCipher: TokenCipher,
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, code: string): Promise<GmailConnectResult> {
    if (!this.gmailClient.isAvailable()) return 'unavailable';

    const grant = await this.gmailClient.exchangeCode(code);
    const { refreshToken } = grant;
    const deniedInboxAccess = !grant.canReadInbox;
    if (!refreshToken || deniedInboxAccess) return 'scope_denied';

    const profile = await this.gmailClient.getProfile(grant.accessToken);
    const email = profile.emailAddress.toLowerCase();

    const [owner, previous] = await Promise.all([
      this.gmailConnectionRepository.findByEmail(email),
      this.gmailConnectionRepository.findByUser(userId),
    ]);

    const belongsToAnotherUser = owner !== null && owner.userId !== userId;
    if (belongsToAnotherUser) return 'taken';

    const isSwitchingAccount = previous !== null && previous.email !== email;
    if (isSwitchingAccount) await this.gmailAccess.disconnect(userId);

    const { historyId, watchExpiresAt } = await this.gmailClient.watch(grant.accessToken);
    const saved = await this.gmailConnectionRepository.save(userId, {
      email,
      sealedRefreshToken: this.tokenCipher.seal(refreshToken),
      status: 'active',
      historyId,
      watchExpiresAt,
    });
    if (saved === 'taken') return 'taken';

    this.logger.info({ userId }, 'inbox.gmail_connected');
    return 'connected';
  }
}
