import { Injectable } from '@nestjs/common';
import { fail } from '../../../domain/inbox.errors.js';
import { InboxTransactionRepository } from '../../../domain/inbox-transaction/inbox-transaction.repository.js';
import { InboxSenderRepository } from '../../../domain/inbox-sender/inbox-sender.repository.js';
import { shouldAutoBlock } from '../../parsing/sender.js';

@Injectable()
export class DismissInboxTransactionUseCase {
  constructor(
    private readonly inboxTransactionRepository: InboxTransactionRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
  ) {}

  async execute(userId: string, id: string) {
    const item = await this.inboxTransactionRepository.findPendingOwned(userId, id);
    if (!item) return fail('not_found');

    await this.inboxTransactionRepository.markDismissed(item.id);
    const sender = await this.inboxSenderRepository.recordDismissal(userId, item.senderAddress);

    const isStillTrusted = sender.status === 'trusted';
    if (isStillTrusted && shouldAutoBlock(item.senderAddress, sender)) {
      await this.inboxSenderRepository.block(sender.id);
    }

    return { ok: true as const };
  }
}
