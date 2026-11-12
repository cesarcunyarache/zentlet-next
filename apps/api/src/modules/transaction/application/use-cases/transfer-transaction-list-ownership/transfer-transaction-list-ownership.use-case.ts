import { Injectable } from '@nestjs/common';
import {
  TransactionListForbiddenError,
  TransactionListMembershipNotFoundError,
  TransactionListNotFoundError,
} from '../../../domain/transaction-list.errors.js';
import { TransactionListMemberRepository } from '../../../domain/transaction-list-member/transaction-list-member.repository.js';
import type { TransferTransactionListOwnershipInput } from './transfer-transaction-list-ownership.input.js';

@Injectable()
export class TransferTransactionListOwnershipUseCase {
  constructor(private readonly transactionListMemberRepository: TransactionListMemberRepository) {}

  async execute(input: TransferTransactionListOwnershipInput): Promise<void> {
    const membership = await this.transactionListMemberRepository.find(input.listId, input.userId);
    if (!membership) throw new TransactionListNotFoundError(input.listId);
    if (membership.role !== 'owner') throw new TransactionListForbiddenError(input.listId);

    const target = await this.transactionListMemberRepository.find(input.listId, input.newOwnerId);
    if (!target) throw new TransactionListMembershipNotFoundError(input.listId, input.newOwnerId);
    if (target.role === 'owner') throw new TransactionListForbiddenError(input.listId);

    await this.transactionListMemberRepository.transferOwnership(input.listId, input.userId, input.newOwnerId);
  }
}
