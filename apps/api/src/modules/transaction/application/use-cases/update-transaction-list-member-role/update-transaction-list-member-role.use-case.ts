import { Injectable } from '@nestjs/common';
import {
  TransactionListForbiddenError,
  TransactionListMembershipNotFoundError,
  TransactionListNotFoundError,
} from '../../../domain/transaction-list.errors.js';
import { TransactionListMemberRepository } from '../../../domain/transaction-list-member/transaction-list-member.repository.js';
import type { UpdateTransactionListMemberRoleInput } from './update-transaction-list-member-role.input.js';

@Injectable()
export class UpdateTransactionListMemberRoleUseCase {
  constructor(private readonly transactionListMemberRepository: TransactionListMemberRepository) {}

  async execute(input: UpdateTransactionListMemberRoleInput): Promise<void> {
    const membership = await this.transactionListMemberRepository.find(input.listId, input.userId);
    if (!membership) throw new TransactionListNotFoundError(input.listId);
    if (membership.role !== 'owner') throw new TransactionListForbiddenError(input.listId);

    const target = await this.transactionListMemberRepository.find(input.listId, input.memberId);
    if (!target) throw new TransactionListMembershipNotFoundError(input.listId, input.memberId);
    if (target.role === 'owner') throw new TransactionListForbiddenError(input.listId);

    await this.transactionListMemberRepository.updateRole(input.listId, input.memberId, input.role);
  }
}
