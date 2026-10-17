import type { GmailConnectResult } from "../../../types";
import type { GmailGateway, InboxMonitor, TokenCipher } from "../../domain/ports/inbox.ports";
import type { GmailConnectionRepository } from "../../domain/repositories/gmail-connection.repository";
import type { GmailAccessService } from "../services/gmail-access.service";

export class CompleteGmailConnectUseCase {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailGateway: GmailGateway,
    private readonly gmailAccess: GmailAccessService,
    private readonly tokenCipher: TokenCipher,
    private readonly inboxMonitor: InboxMonitor,
  ) {}

  async execute(userId: string, code: string): Promise<GmailConnectResult> {
    if (!this.gmailGateway.isAvailable()) return "unavailable";

    const grant = await this.gmailGateway.exchangeCode(code);
    const { refreshToken } = grant;
    const deniedInboxAccess = !grant.canReadInbox;
    if (!refreshToken || deniedInboxAccess) return "scope_denied";

    const profile = await this.gmailGateway.getProfile(grant.accessToken);
    const email = profile.emailAddress.toLowerCase();

    const [owner, previous] = await Promise.all([
      this.gmailConnectionRepository.findByEmail(email),
      this.gmailConnectionRepository.findByUser(userId),
    ]);

    const belongsToAnotherUser = owner !== null && owner.userId !== userId;
    if (belongsToAnotherUser) return "taken";

    const isSwitchingAccount = previous !== null && previous.email !== email;
    if (isSwitchingAccount) await this.gmailAccess.disconnect(userId);

    const { historyId, watchExpiresAt } = await this.gmailGateway.watch(grant.accessToken);
    const saved = await this.gmailConnectionRepository.save(userId, {
      email,
      sealedRefreshToken: this.tokenCipher.seal(refreshToken),
      status: "active",
      historyId,
      watchExpiresAt,
    });
    if (saved === "taken") return "taken";

    this.inboxMonitor.info("inbox.gmail_connected", { userId });
    return "connected";
  }
}
