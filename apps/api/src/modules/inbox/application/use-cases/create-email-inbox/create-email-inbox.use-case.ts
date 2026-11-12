import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { fail } from '../../../domain/inbox.errors.js';
import { EmailInboxRepository } from '../../../domain/email-inbox/email-inbox.repository.js';
import { InboundMailbox } from '../../../domain/inbound-mailbox.js';
import { generateLocalPart, inboxAddress } from '../../parsing/inbox-address.js';

const MAX_ADDRESS_ATTEMPTS = 3;

@Injectable()
export class CreateEmailInboxUseCase {
  constructor(
    private readonly emailInboxRepository: EmailInboxRepository,
    private readonly inboundMailbox: InboundMailbox,
  ) {}

  async execute(userId: string) {
    const domain = this.inboundMailbox.domain();
    if (!domain) return fail('email_import_unavailable');

    const existing = await this.emailInboxRepository.findByUser(userId);
    if (existing) return { inbox: existing };

    for (let attempt = 0; attempt < MAX_ADDRESS_ATTEMPTS; attempt++) {
      const address = inboxAddress(generateLocalPart(randomBytes), domain);
      const created = await this.emailInboxRepository.insert(userId, address);
      const addressTaken = created === 'conflict';
      if (!addressTaken) return { inbox: created };

      const createdByConcurrentRequest = await this.emailInboxRepository.findByUser(userId);
      if (createdByConcurrentRequest) return { inbox: createdByConcurrentRequest };
    }

    throw new Error('Could not allocate an inbox address');
  }
}
