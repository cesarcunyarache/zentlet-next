import { Injectable } from '@nestjs/common';
import { fail } from '../../../domain/inbox.errors.js';
import { InboxSenderRepository } from '../../../domain/inbox-sender/inbox-sender.repository.js';
import { normalizeSenderPattern } from '../../parsing/sender.js';

@Injectable()
export class TrustInboxSenderUseCase {
  constructor(private readonly inboxSenderRepository: InboxSenderRepository) {}

  async execute(userId: string, address: string) {
    const pattern = normalizeSenderPattern(address);
    if (!pattern) return fail('invalid_sender');

    const sender = await this.inboxSenderRepository.trust(userId, pattern);
    return { sender };
  }
}
