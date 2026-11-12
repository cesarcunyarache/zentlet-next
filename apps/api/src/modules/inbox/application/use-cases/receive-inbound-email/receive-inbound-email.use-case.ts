import { Injectable } from '@nestjs/common';
import type { InboundEmail } from '../../../domain/inbox-transaction/inbox-transaction.js';
import { EmailInboxRepository } from '../../../domain/email-inbox/email-inbox.repository.js';
import { emailBody } from '../../parsing/html-text.js';
import { readGmailVerification } from '../../parsing/gmail-forwarding.js';
import { normalizeAddress } from '../../parsing/sender.js';
import { EmailIngestionService, type IngestOutcome } from '../../services/email-ingestion.service.js';

@Injectable()
export class ReceiveInboundEmailUseCase {
  constructor(
    private readonly emailInboxRepository: EmailInboxRepository,
    private readonly emailIngestion: EmailIngestionService,
  ) {}

  async execute(email: InboundEmail): Promise<IngestOutcome | 'unknown_recipient' | 'verification'> {
    const inbox = await this.findRecipientInbox(email.recipients);
    if (!inbox) return 'unknown_recipient';

    const body = emailBody(email.text, email.html);
    const verification = readGmailVerification(email, body);
    await this.emailInboxRepository.recordReceipt(inbox.id, email.receivedAt, verification);
    if (verification) return 'verification';

    return this.emailIngestion.ingest(inbox.userId, email, body);
  }

  private async findRecipientInbox(recipients: string[]) {
    const addresses = recipients.map(normalizeAddress).filter(Boolean);
    if (addresses.length === 0) return null;
    return this.emailInboxRepository.findByAddresses(addresses);
  }
}
