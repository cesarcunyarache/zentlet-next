import { isTrustedRule } from "../../../lib/sender";
import type { InboxConnection } from "../../domain/entities/inbox-connection.entity";
import type { InboxSender } from "../../domain/entities/inbox-sender.entity";
import type { GmailGateway, InboundMailbox } from "../../domain/ports/inbox.ports";
import type { EmailInboxRepository } from "../../domain/repositories/email-inbox.repository";
import type { GmailConnectionRepository } from "../../domain/repositories/gmail-connection.repository";
import type { InboxSenderRepository } from "../../domain/repositories/inbox-sender.repository";

const isVisibleSender = (sender: InboxSender) => sender.status === "blocked" || isTrustedRule(sender);

export class GetInboxConnectionUseCase {
  constructor(
    private readonly emailInboxRepository: EmailInboxRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly inboundMailbox: InboundMailbox,
    private readonly gmailGateway: GmailGateway,
  ) {}

  async execute(userId: string): Promise<InboxConnection> {
    const [inbox, senders, gmailConnection] = await Promise.all([
      this.emailInboxRepository.findByUser(userId),
      this.inboxSenderRepository.findAll(userId),
      this.gmailConnectionRepository.findByUser(userId),
    ]);

    return {
      isAvailable: this.inboundMailbox.domain() !== null,
      inbox,
      visibleSenders: senders.filter(isVisibleSender),
      gmail: { isAvailable: this.gmailGateway.isAvailable(), connection: gmailConnection },
    };
  }
}
