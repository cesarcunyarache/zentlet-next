import { Injectable } from '@nestjs/common';
import { EmailInboxRepository } from '../../../domain/email-inbox/email-inbox.repository.js';
import { GmailConnectionRepository } from '../../../domain/gmail-connection/gmail-connection.repository.js';
import { GmailClient } from '../../../domain/gmail-client.js';
import { InboundMailbox } from '../../../domain/inbound-mailbox.js';
import { InboxSenderRepository } from '../../../domain/inbox-sender/inbox-sender.repository.js';
import type { InboxSender } from '../../../domain/inbox-sender/inbox-sender.js';
import { isTrustedRule } from '../../parsing/sender.js';
import type { InboxConnection } from './get-inbox-connection.output.js';

const isVisibleSender = (sender: InboxSender): boolean => sender.status === 'blocked' || isTrustedRule(sender);

@Injectable()
export class GetInboxConnectionUseCase {
  constructor(
    private readonly emailInboxRepository: EmailInboxRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
    private readonly gmailConnectionRepository: GmailConnectionRepository,
    private readonly inboundMailbox: InboundMailbox,
    private readonly gmailClient: GmailClient,
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
      gmail: { isAvailable: this.gmailClient.isAvailable(), connection: gmailConnection },
    };
  }
}
