import type { GmailAccessService } from "../services/gmail-access.service";

export class DisconnectGmailUseCase {
  constructor(private readonly gmailAccess: GmailAccessService) {}

  execute(userId: string) {
    return this.gmailAccess.disconnect(userId);
  }
}
