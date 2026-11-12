import { describe, expect, it } from 'vitest';
import {
  TransactionListForbiddenError,
  TransactionListMembershipNotFoundError,
  TransactionListNotFoundError,
} from '../../../domain/transaction-list.errors.js';
import { InMemoryTransactionListMemberRepository } from '../../../infrastructure/transaction-list-member/in-memory-transaction-list-member.repository.js';
import { UpdateTransactionListMemberRoleUseCase } from './update-transaction-list-member-role.use-case.js';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

function makeUseCase() {
  const transactionListMemberRepository = new InMemoryTransactionListMemberRepository();
  transactionListMemberRepository.seedMember(LIST_ID, OWNER_ID, 'owner');
  transactionListMemberRepository.seedMember(LIST_ID, 'viewer-1', 'viewer');
  transactionListMemberRepository.seedMember(LIST_ID, 'editor-1', 'editor');

  return { useCase: new UpdateTransactionListMemberRoleUseCase(transactionListMemberRepository), transactionListMemberRepository };
}

describe('UpdateTransactionListMemberRoleUseCase', () => {
  it('lets the owner promote a viewer to editor', async () => {
    const { useCase, transactionListMemberRepository } = makeUseCase();

    await useCase.execute({ userId: OWNER_ID, listId: LIST_ID, memberId: 'viewer-1', role: 'editor' });

    const member = await transactionListMemberRepository.find(LIST_ID, 'viewer-1');
    expect(member?.role).toBe('editor');
  });

  it('rejects a caller who is not a member', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: 'stranger', listId: LIST_ID, memberId: 'viewer-1', role: 'editor' }),
    ).rejects.toThrow(TransactionListNotFoundError);
  });

  it('rejects an editor trying to promote themselves', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: 'editor-1', listId: LIST_ID, memberId: 'editor-1', role: 'editor' }),
    ).rejects.toThrow(TransactionListForbiddenError);
  });

  it('rejects a viewer trying to change roles', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: 'viewer-1', listId: LIST_ID, memberId: 'editor-1', role: 'viewer' }),
    ).rejects.toThrow(TransactionListForbiddenError);
  });

  it('rejects demoting the owner', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: OWNER_ID, listId: LIST_ID, memberId: OWNER_ID, role: 'editor' }),
    ).rejects.toThrow(TransactionListForbiddenError);
  });

  it('rejects an unknown target member', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: OWNER_ID, listId: LIST_ID, memberId: 'missing', role: 'editor' }),
    ).rejects.toThrow(TransactionListMembershipNotFoundError);
  });
});
