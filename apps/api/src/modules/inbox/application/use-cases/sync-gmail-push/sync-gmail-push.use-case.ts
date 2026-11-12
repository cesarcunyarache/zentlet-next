import { Injectable } from '@nestjs/common';
import { isActiveConnection } from '../../../domain/gmail-connection/gmail-connection.js';
import { GmailConnectionRepository } from '../../../domain/gmail-connection/gmail-connection.repository.js';
import { GmailSyncService, type GmailSyncOutcome } from '../../services/gmail-sync.service.js';

@Injectable()
export class SyncGmailPushUseCase {
  constructor(
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly gmailSync: GmailSyncService,
  ) {}

  async execute(email: string): Promise<GmailSyncOutcome | 'unknown'> {
    const connection = await this.gmailConnectionRepository.findByEmail(email);
    if (!connection || !isActiveConnection(connection)) return 'unknown';
    return this.gmailSync.sync(connection);
  }
}
