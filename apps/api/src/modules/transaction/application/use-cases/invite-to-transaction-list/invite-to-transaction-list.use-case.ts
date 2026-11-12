import { Injectable } from '@nestjs/common';
import { InviteTokenService } from '../../services/invite-token.service.js';
import {
  TransactionListForbiddenError,
  TransactionListNotFoundError,
  TransactionListPrivateError,
} from '../../../domain/transaction-list.errors.js';
import { TransactionListRepository } from '../../../domain/transaction-list/transaction-list.repository.js';
import { INVITE_TTL_MS } from '../../../domain/transaction-list-invite/transaction-list-invite.policy.js';
import { TransactionListInviteRepository } from '../../../domain/transaction-list-invite/transaction-list-invite.repository.js';
import { TransactionListMemberRepository } from '../../../domain/transaction-list-member/transaction-list-member.repository.js';
import type { InviteToTransactionListInput } from './invite-to-transaction-list.input.js';
import type { InviteToTransactionListOutput } from './invite-to-transaction-list.output.js';

@Injectable()
export class InviteToTransactionListUseCase {
  constructor(
    private readonly transactionListInviteRepository: TransactionListInviteRepository,
    private readonly transactionListRepository: TransactionListRepository,
    private readonly transactionListMemberRepository: TransactionListMemberRepository,
    private readonly inviteTokenService: InviteTokenService,
  ) {}

  async execute(input: InviteToTransactionListInput, now = new Date()): Promise<InviteToTransactionListOutput> {
    const membership = await this.transactionListMemberRepository.find(input.listId, input.userId);
    if (!membership) throw new TransactionListNotFoundError(input.listId);
    if (membership.role !== 'owner') throw new TransactionListForbiddenError(input.listId);

    const list = await this.transactionListRepository.findById(input.listId);
    const isPrivateList = list === null || list.privateOwnerId !== null;
    if (isPrivateList) throw new TransactionListPrivateError(input.listId);

    const { token, hash } = this.inviteTokenService.create();
    const invite = await this.transactionListInviteRepository.create({
      id: crypto.randomUUID(),
      listId: input.listId,
      role: input.role,
      email: input.email ?? null,
      tokenHash: hash,
      createdById: input.userId,
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    });

    return { invite, token };
  }
}
