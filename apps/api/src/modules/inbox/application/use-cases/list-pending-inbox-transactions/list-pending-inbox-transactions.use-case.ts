import { Injectable } from '@nestjs/common';
import type { InboxTransaction } from '../../../domain/inbox-transaction/inbox-transaction.js';
import { InboxTransactionRepository } from '../../../domain/inbox-transaction/inbox-transaction.repository.js';

@Injectable()
export class ListPendingInboxTransactionsUseCase {
  constructor(private readonly inboxTransactionRepository: InboxTransactionRepository) {}

  execute(userId: string): Promise<InboxTransaction[]> {
    return this.inboxTransactionRepository.findPending(userId);
  }
}
