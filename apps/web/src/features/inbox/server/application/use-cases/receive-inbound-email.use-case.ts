import type { InboundEmail } from "../../../types";
import { readGmailVerification } from "../../../lib/gmail";
import { emailBody } from "../../../lib/html-text";
import { normalizeAddress } from "../../../lib/sender";
import type { EmailInboxRepository } from "../../domain/repositories/email-inbox.repository";
import type { EmailIngestionService, IngestOutcome } from "../services/email-ingestion.service";

export class ReceiveInboundEmailUseCase {
  constructor(
    private readonly emailInboxRepository: EmailInboxRepository,
    private readonly emailIngestion: EmailIngestionService,
  ) {}

  async execute(email: InboundEmail): Promise<IngestOutcome> {
    const inbox = await this.findRecipientInbox(email.recipients);
    if (!inbox) return "unknown_recipient";

    const body = emailBody(email.text, email.html);
    const verification = readGmailVerification(email, body);
    await this.emailInboxRepository.recordReceipt(inbox.id, email.receivedAt, verification);
    if (verification) return "verification";

    return this.emailIngestion.ingest(inbox.userId, email, body);
  }

  private async findRecipientInbox(recipients: string[]) {
    const addresses = recipients.map(normalizeAddress).filter(Boolean);
    if (addresses.length === 0) return null;
    return this.emailInboxRepository.findByAddresses(addresses);
  }
}
