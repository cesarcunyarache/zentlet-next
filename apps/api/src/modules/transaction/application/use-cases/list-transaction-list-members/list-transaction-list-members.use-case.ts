import { Injectable } from '@nestjs/common';
import { TransactionListNotFoundError } from '../../../domain/transaction-list.errors.js';
import { TransactionListMemberRepository } from '../../../domain/transaction-list-member/transaction-list-member.repository.js';
import type { ListTransactionListMembersInput } from './list-transaction-list-members.input.js';
import type { ListTransactionListMembersOutput } from './list-transaction-list-members.output.js';

@Injectable()
export class ListTransactionListMembersUseCase {
  constructor(private readonly transactionListMemberRepository: TransactionListMemberRepository) {}

  async execute(input: ListTransactionListMembersInput): Promise<ListTransactionListMembersOutput> {
    const membership = await this.transactionListMemberRepository.find(input.listId, input.userId);
    if (!membership) throw new TransactionListNotFoundError(input.listId);

    const members = await this.transactionListMemberRepository.findAll(input.listId);
    return { members };
  }
}
