import { Injectable } from '@nestjs/common';
import { InviteTokenService } from '../../services/invite-token.service.js';
import { TransactionListInviteInvalidError } from '../../../domain/transaction-list.errors.js';
import { isInviteUsable } from '../../../domain/transaction-list-invite/transaction-list-invite.policy.js';
import { TransactionListInviteRepository } from '../../../domain/transaction-list-invite/transaction-list-invite.repository.js';
import { TransactionListMemberRepository } from '../../../domain/transaction-list-member/transaction-list-member.repository.js';
import type { AcceptTransactionListInviteInput } from './accept-transaction-list-invite.input.js';
import type { AcceptTransactionListInviteOutput } from './accept-transaction-list-invite.output.js';

@Injectable()
export class AcceptTransactionListInviteUseCase {
  constructor(
    private readonly transactionListInviteRepository: TransactionListInviteRepository,
    private readonly transactionListMemberRepository: TransactionListMemberRepository,
    private readonly inviteTokenService: InviteTokenService,
  ) {}

  async execute(input: AcceptTransactionListInviteInput, now = new Date()): Promise<AcceptTransactionListInviteOutput> {
    const invite = await this.transactionListInviteRepository.findByTokenHash(this.inviteTokenService.hash(input.token));
    if (!invite) throw new TransactionListInviteInvalidError();

    const existingMembership = await this.transactionListMemberRepository.find(invite.listId, input.userId);
    if (existingMembership) return { listId: invite.listId, joined: false };

    if (!isInviteUsable(invite, now)) throw new TransactionListInviteInvalidError();

    const accepted = await this.transactionListInviteRepository.accept(invite.id, input.userId, now);
    if (accepted === 'not_usable') throw new TransactionListInviteInvalidError();

    return { listId: invite.listId, joined: true };
  }
}
