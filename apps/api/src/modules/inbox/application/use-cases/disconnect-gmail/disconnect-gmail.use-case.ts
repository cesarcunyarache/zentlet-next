import { Injectable } from '@nestjs/common';
import { GmailAccessService } from '../../services/gmail-access.service.js';

@Injectable()
export class DisconnectGmailUseCase {
  constructor(private readonly gmailAccess: GmailAccessService) {}

  execute(userId: string): Promise<void> {
    return this.gmailAccess.disconnect(userId);
  }
}
