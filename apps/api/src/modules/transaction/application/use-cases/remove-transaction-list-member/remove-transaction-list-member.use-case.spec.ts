import { describe, expect, it } from 'vitest';
import {
  TransactionListForbiddenError,
  TransactionListMembershipNotFoundError,
  TransactionListNotFoundError,
  TransactionListOwnerCannotLeaveError,
} from '../../../domain/transaction-list.errors.js';
import { InMemoryTransactionListMemberRepository } from '../../../infrastructure/transaction-list-member/in-memory-transaction-list-member.repository.js';
import { RemoveTransactionListMemberUseCase } from './remove-transaction-list-member.use-case.js';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

function makeUseCase() {
  const transactionListMemberRepository = new InMemoryTransactionListMemberRepository();
  transactionListMemberRepository.seedMember(LIST_ID, OWNER_ID, 'owner');
  transactionListMemberRepository.seedMember(LIST_ID, 'viewer-1', 'viewer');
  transactionListMemberRepository.seedMember(LIST_ID, 'editor-1', 'editor');

  return { useCase: new RemoveTransactionListMemberUseCase(transactionListMemberRepository), transactionListMemberRepository };
}

describe('RemoveTransactionListMemberUseCase', () => {
  it('lets the owner remove another member', async () => {
    const { useCase, transactionListMemberRepository } = makeUseCase();

    await useCase.execute({ userId: OWNER_ID, listId: LIST_ID, memberId: 'viewer-1' });

    expect(await transactionListMemberRepository.find(LIST_ID, 'viewer-1')).toBeNull();
  });

  it('lets a non-owner member leave on their own', async () => {
    const { useCase, transactionListMemberRepository } = makeUseCase();

    await useCase.execute({ userId: 'editor-1', listId: LIST_ID, memberId: 'editor-1' });

    expect(await transactionListMemberRepository.find(LIST_ID, 'editor-1')).toBeNull();
  });

  it('rejects the owner leaving without transferring ownership first', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({ userId: OWNER_ID, listId: LIST_ID, memberId: OWNER_ID })).rejects.toThrow(
      TransactionListOwnerCannotLeaveError,
    );
  });

  it('rejects a viewer removing another member', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: 'viewer-1', listId: LIST_ID, memberId: 'editor-1' }),
    ).rejects.toThrow(TransactionListForbiddenError);
  });

  it('rejects a caller who is not a member', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: 'stranger', listId: LIST_ID, memberId: 'viewer-1' }),
    ).rejects.toThrow(TransactionListNotFoundError);
  });

  it('rejects removing an unknown target member', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: OWNER_ID, listId: LIST_ID, memberId: 'missing' }),
    ).rejects.toThrow(TransactionListMembershipNotFoundError);
  });
});
