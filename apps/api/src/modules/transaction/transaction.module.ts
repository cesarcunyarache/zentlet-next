import { Module } from '@nestjs/common';
import { InviteTokenService } from './application/services/invite-token.service.js';
import { ListPlacementService } from './application/services/list-placement.service.js';
import { AcceptTransactionListInviteUseCase } from './application/use-cases/accept-transaction-list-invite/accept-transaction-list-invite.use-case.js';
import { CreateTransactionListUseCase } from './application/use-cases/create-transaction-list/create-transaction-list.use-case.js';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction/create-transaction.use-case.js';
import { DeleteTransactionUseCase } from './application/use-cases/delete-transaction/delete-transaction.use-case.js';
import { InviteToTransactionListUseCase } from './application/use-cases/invite-to-transaction-list/invite-to-transaction-list.use-case.js';
import { ListTransactionListMembersUseCase } from './application/use-cases/list-transaction-list-members/list-transaction-list-members.use-case.js';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions/list-transactions.use-case.js';
import { RemoveTransactionListMemberUseCase } from './application/use-cases/remove-transaction-list-member/remove-transaction-list-member.use-case.js';
import { RevokeTransactionListInviteUseCase } from './application/use-cases/revoke-transaction-list-invite/revoke-transaction-list-invite.use-case.js';
import { SummarizeTransactionsUseCase } from './application/use-cases/summarize-transactions/summarize-transactions.use-case.js';
import { TransferTransactionListOwnershipUseCase } from './application/use-cases/transfer-transaction-list-ownership/transfer-transaction-list-ownership.use-case.js';
import { UpdateTransactionListMemberRoleUseCase } from './application/use-cases/update-transaction-list-member-role/update-transaction-list-member-role.use-case.js';
import { UpdateTransactionUseCase } from './application/use-cases/update-transaction/update-transaction.use-case.js';
import { TransactionListInviteRepository } from './domain/transaction-list-invite/transaction-list-invite.repository.js';
import { TransactionListMemberRepository } from './domain/transaction-list-member/transaction-list-member.repository.js';
import { TransactionListRepository } from './domain/transaction-list/transaction-list.repository.js';
import { TransactionRepository } from './domain/transaction/transaction.repository.js';
import { PrismaTransactionListInviteRepository } from './infrastructure/transaction-list-invite/prisma-transaction-list-invite.repository.js';
import { PrismaTransactionListMemberRepository } from './infrastructure/transaction-list-member/prisma-transaction-list-member.repository.js';
import { PrismaTransactionListRepository } from './infrastructure/transaction-list/prisma-transaction-list.repository.js';
import { PrismaTransactionRepository } from './infrastructure/transaction/prisma-transaction.repository.js';

@Module({
  providers: [
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    SummarizeTransactionsUseCase,
    CreateTransactionListUseCase,
    InviteToTransactionListUseCase,
    AcceptTransactionListInviteUseCase,
    RevokeTransactionListInviteUseCase,
    ListTransactionListMembersUseCase,
    UpdateTransactionListMemberRoleUseCase,
    RemoveTransactionListMemberUseCase,
    TransferTransactionListOwnershipUseCase,
    ListPlacementService,
    InviteTokenService,
    { provide: TransactionRepository, useClass: PrismaTransactionRepository },
    { provide: TransactionListRepository, useClass: PrismaTransactionListRepository },
    { provide: TransactionListMemberRepository, useClass: PrismaTransactionListMemberRepository },
    { provide: TransactionListInviteRepository, useClass: PrismaTransactionListInviteRepository },
  ],
  exports: [
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    SummarizeTransactionsUseCase,
    CreateTransactionListUseCase,
    InviteToTransactionListUseCase,
    AcceptTransactionListInviteUseCase,
    RevokeTransactionListInviteUseCase,
    ListTransactionListMembersUseCase,
    UpdateTransactionListMemberRoleUseCase,
    RemoveTransactionListMemberUseCase,
    TransferTransactionListOwnershipUseCase,
  ],
})
export class TransactionModule {}
