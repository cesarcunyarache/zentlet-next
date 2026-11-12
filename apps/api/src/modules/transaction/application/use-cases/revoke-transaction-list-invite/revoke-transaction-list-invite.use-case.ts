import { Injectable } from '@nestjs/common';
import {
  TransactionListForbiddenError,
  TransactionListInviteInvalidError,
  TransactionListNotFoundError,
} from '../../../domain/transaction-list.errors.js';
import { TransactionListInviteRepository } from '../../../domain/transaction-list-invite/transaction-list-invite.repository.js';
import { TransactionListMemberRepository } from '../../../domain/transaction-list-member/transaction-list-member.repository.js';
import type { RevokeTransactionListInviteInput } from './revoke-transaction-list-invite.input.js';

@Injectable()
export class RevokeTransactionListInviteUseCase {
  constructor(
    private readonly transactionListInviteRepository: TransactionListInviteRepository,
    private readonly transactionListMemberRepository: TransactionListMemberRepository,
  ) {}

  async execute(input: RevokeTransactionListInviteInput, now = new Date()): Promise<void> {
    const membership = await this.transactionListMemberRepository.find(input.listId, input.userId);
    if (!membership) throw new TransactionListNotFoundError(input.listId);
    if (membership.role !== 'owner') throw new TransactionListForbiddenError(input.listId);

    const revoked = await this.transactionListInviteRepository.revoke(input.listId, input.inviteId, now);
    if (revoked === 'not_revocable') throw new TransactionListInviteInvalidError();
  }
}
