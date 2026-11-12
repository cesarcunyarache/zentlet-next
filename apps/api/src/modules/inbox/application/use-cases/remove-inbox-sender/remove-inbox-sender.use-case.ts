import { Injectable } from '@nestjs/common';
import { fail } from '../../../domain/inbox.errors.js';
import { InboxSenderRepository } from '../../../domain/inbox-sender/inbox-sender.repository.js';

@Injectable()
export class RemoveInboxSenderUseCase {
  constructor(private readonly inboxSenderRepository: InboxSenderRepository) {}

  async execute(userId: string, id: string) {
    const result = await this.inboxSenderRepository.deleteOwned(userId, id);
    if (result === 'not_found') return fail('sender_not_found');
    return { ok: true as const };
  }
}
