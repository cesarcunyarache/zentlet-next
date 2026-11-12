import { describe, expect, it } from 'vitest';
import {
  TransactionListForbiddenError,
  TransactionListMembershipNotFoundError,
  TransactionListNotFoundError,
} from '../../../domain/transaction-list.errors.js';
import { InMemoryTransactionListMemberRepository } from '../../../infrastructure/transaction-list-member/in-memory-transaction-list-member.repository.js';
import { TransferTransactionListOwnershipUseCase } from './transfer-transaction-list-ownership.use-case.js';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

function makeUseCase() {
  const transactionListMemberRepository = new InMemoryTransactionListMemberRepository();
  transactionListMemberRepository.seedMember(LIST_ID, OWNER_ID, 'owner');
  transactionListMemberRepository.seedMember(LIST_ID, 'editor-1', 'editor');
  transactionListMemberRepository.seedMember(LIST_ID, 'viewer-1', 'viewer');

  return { useCase: new TransferTransactionListOwnershipUseCase(transactionListMemberRepository), transactionListMemberRepository };
}

describe('TransferTransactionListOwnershipUseCase', () => {
  it("updates both the old and new owner's membership rows", async () => {
    const { useCase, transactionListMemberRepository } = makeUseCase();

    await useCase.execute({ userId: OWNER_ID, listId: LIST_ID, newOwnerId: 'editor-1' });

    const newOwner = await transactionListMemberRepository.find(LIST_ID, 'editor-1');
    expect(newOwner?.role).toBe('owner');
    expect(await transactionListMemberRepository.find(LIST_ID, OWNER_ID)).toBeNull();
  });

  it('rejects a caller who is not the owner', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: 'editor-1', listId: LIST_ID, newOwnerId: 'viewer-1' }),
    ).rejects.toThrow(TransactionListForbiddenError);
  });

  it('rejects a caller who is not a member', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: 'stranger', listId: LIST_ID, newOwnerId: 'viewer-1' }),
    ).rejects.toThrow(TransactionListNotFoundError);
  });

  it('rejects transferring to someone who is not a member', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: OWNER_ID, listId: LIST_ID, newOwnerId: 'missing' }),
    ).rejects.toThrow(TransactionListMembershipNotFoundError);
  });

  it('rejects transferring to the current owner', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ userId: OWNER_ID, listId: LIST_ID, newOwnerId: OWNER_ID }),
    ).rejects.toThrow(TransactionListForbiddenError);
  });
});
