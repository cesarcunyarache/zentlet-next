import { describe, expect, it } from 'vitest';
import {
  TransactionListForbiddenError,
  TransactionListInviteInvalidError,
  TransactionListNotFoundError,
} from '../../../domain/transaction-list.errors.js';
import { InMemoryTransactionListInviteRepository } from '../../../infrastructure/transaction-list-invite/in-memory-transaction-list-invite.repository.js';
import { InMemoryTransactionListMemberRepository } from '../../../infrastructure/transaction-list-member/in-memory-transaction-list-member.repository.js';
import { RevokeTransactionListInviteUseCase } from './revoke-transaction-list-invite.use-case.js';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

function makeUseCase() {
  const transactionListMemberRepository = new InMemoryTransactionListMemberRepository();
  const transactionListInviteRepository = new InMemoryTransactionListInviteRepository(transactionListMemberRepository);
  transactionListMemberRepository.seedMember(LIST_ID, OWNER_ID, 'owner');

  const useCase = new RevokeTransactionListInviteUseCase(transactionListInviteRepository, transactionListMemberRepository);
  return { useCase, transactionListInviteRepository, transactionListMemberRepository };
}

async function seedActiveInvite(repository: InMemoryTransactionListInviteRepository) {
  const invite = await repository.create({
    id: crypto.randomUUID(),
    listId: LIST_ID,
    role: 'editor',
    email: null,
    tokenHash: 'hash-1',
    createdById: OWNER_ID,
    expiresAt: new Date('2099-01-01T00:00:00Z'),
  });
  return invite;
}

describe('RevokeTransactionListInviteUseCase', () => {
  it('revokes an active invite when the caller owns the list', async () => {
    const { useCase, transactionListInviteRepository } = makeUseCase();
    const invite = await seedActiveInvite(transactionListInviteRepository);

    await useCase.execute({ userId: OWNER_ID, listId: LIST_ID, inviteId: invite.id });

    const active = await transactionListInviteRepository.findActive(LIST_ID, new Date());
    expect(active).toHaveLength(0);
  });

  it('rejects a caller who is not a member', async () => {
    const { useCase, transactionListInviteRepository } = makeUseCase();
    const invite = await seedActiveInvite(transactionListInviteRepository);

    await expect(
      useCase.execute({ userId: 'stranger', listId: LIST_ID, inviteId: invite.id }),
    ).rejects.toThrow(TransactionListNotFoundError);
  });

  it('rejects an editor revoking an invite', async () => {
    const { useCase, transactionListInviteRepository, transactionListMemberRepository } = makeUseCase();
    const invite = await seedActiveInvite(transactionListInviteRepository);
    await transactionListMemberRepository.create(LIST_ID, 'editor-1', 'editor');

    await expect(
      useCase.execute({ userId: 'editor-1', listId: LIST_ID, inviteId: invite.id }),
    ).rejects.toThrow(TransactionListForbiddenError);
  });

  it('rejects revoking an already revoked invite', async () => {
    const { useCase, transactionListInviteRepository } = makeUseCase();
    const invite = await seedActiveInvite(transactionListInviteRepository);
    await useCase.execute({ userId: OWNER_ID, listId: LIST_ID, inviteId: invite.id });

    await expect(
      useCase.execute({ userId: OWNER_ID, listId: LIST_ID, inviteId: invite.id }),
    ).rejects.toThrow(TransactionListInviteInvalidError);
  });
});
