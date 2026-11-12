import { describe, expect, it } from 'vitest';
import { TransactionListNotFoundError } from '../../../domain/transaction-list.errors.js';
import { InMemoryTransactionListMemberRepository } from '../../../infrastructure/transaction-list-member/in-memory-transaction-list-member.repository.js';
import { ListTransactionListMembersUseCase } from './list-transaction-list-members.use-case.js';

const OWNER_ID = 'owner-1';
const VIEWER_ID = 'viewer-1';
const LIST_ID = 'list-1';

function makeUseCase() {
  const transactionListMemberRepository = new InMemoryTransactionListMemberRepository();
  transactionListMemberRepository.seedMember(LIST_ID, OWNER_ID, 'owner');
  transactionListMemberRepository.seedMember(LIST_ID, VIEWER_ID, 'viewer');

  return { useCase: new ListTransactionListMembersUseCase(transactionListMemberRepository), transactionListMemberRepository };
}

describe('ListTransactionListMembersUseCase', () => {
  it('lets any member view the member list, including viewers', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute({ userId: VIEWER_ID, listId: LIST_ID });

    expect(result.members).toHaveLength(2);
    expect(result.members.map((member) => member.userId).sort()).toEqual([OWNER_ID, VIEWER_ID].sort());
  });

  it('rejects a caller who is not a member', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({ userId: 'stranger', listId: LIST_ID })).rejects.toThrow(TransactionListNotFoundError);
  });
});
