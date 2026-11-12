import { Injectable } from '@nestjs/common';
import {
  TransactionListForbiddenError,
  TransactionListMembershipNotFoundError,
  TransactionListNotFoundError,
  TransactionListOwnerCannotLeaveError,
} from '../../../domain/transaction-list.errors.js';
import { TransactionListMemberRepository } from '../../../domain/transaction-list-member/transaction-list-member.repository.js';
import type { RemoveTransactionListMemberInput } from './remove-transaction-list-member.input.js';

@Injectable()
export class RemoveTransactionListMemberUseCase {
  constructor(private readonly transactionListMemberRepository: TransactionListMemberRepository) {}

  async execute(input: RemoveTransactionListMemberInput): Promise<void> {
    const membership = await this.transactionListMemberRepository.find(input.listId, input.userId);
    if (!membership) throw new TransactionListNotFoundError(input.listId);

    const isLeavingList = input.memberId === input.userId;

    if (isLeavingList) {
      if (membership.role === 'owner') throw new TransactionListOwnerCannotLeaveError(input.listId);
    } else {
      if (membership.role !== 'owner') throw new TransactionListForbiddenError(input.listId);

      const target = await this.transactionListMemberRepository.find(input.listId, input.memberId);
      if (!target) throw new TransactionListMembershipNotFoundError(input.listId, input.memberId);
      if (target.role === 'owner') throw new TransactionListForbiddenError(input.listId);
    }

    await this.transactionListMemberRepository.remove(input.listId, input.memberId);
  }
}
