import { Injectable } from '@nestjs/common';
import { fail } from '../../../domain/inbox.errors.js';
import { InboxTransactionRepository } from '../../../domain/inbox-transaction/inbox-transaction.repository.js';
import { InboxSenderRepository } from '../../../domain/inbox-sender/inbox-sender.repository.js';
import { MerchantRuleRepository } from '../../../domain/merchant-rule/merchant-rule.repository.js';
import { merchantKey } from '../../parsing/merchant-key.js';
import type { AcceptInboxTransactionInput } from './accept-inbox-transaction.input.js';
import type { AcceptInboxTransactionOutput } from './accept-inbox-transaction.output.js';

@Injectable()
export class AcceptInboxTransactionUseCase {
  constructor(
    private readonly inboxTransactionRepository: InboxTransactionRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
    private readonly merchantRuleRepository: MerchantRuleRepository,
  ) {}

  async execute(userId: string, id: string, input: AcceptInboxTransactionInput) {
    const item = await this.inboxTransactionRepository.findPendingOwned(userId, id);
    if (!item) return fail('not_found');

    const ownsCategory = await this.inboxTransactionRepository.categoryBelongsTo(userId, input.categoryId);
    if (!ownsCategory) return fail('category_not_found');

    const draft = {
      userId,
      description: input.description,
      amount: input.amount,
      type: input.type,
      categoryId: input.categoryId,
      transactionDate: new Date(input.transactionDate),
      reference: item.reference,
    };

    await this.inboxTransactionRepository.markAccepted(item, draft);

    const key = merchantKey(item.merchant ?? item.description);
    if (key) await this.merchantRuleRepository.upsert(userId, key, input.categoryId, input.description);
    await this.inboxSenderRepository.recordAcceptance(userId, item.senderAddress);

    return { inboxTransactionId: item.id, transaction: draft } satisfies AcceptInboxTransactionOutput;
  }
}
