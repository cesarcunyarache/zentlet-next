import { isActiveConnection } from "../../domain/entities/gmail-connection.entity";
import type { GmailConnectionRepository } from "../../domain/repositories/gmail-connection.repository";
import type { GmailSyncOutcome, GmailSyncService } from "../services/gmail-sync.service";

export class SyncGmailPushUseCase {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailSync: GmailSyncService,
  ) {}

  async execute(email: string): Promise<GmailSyncOutcome | "unknown"> {
    const connection = await this.gmailConnectionRepository.findByEmail(email);
    if (!connection || !isActiveConnection(connection)) return "unknown";
    return this.gmailSync.sync(connection);
  }
}
