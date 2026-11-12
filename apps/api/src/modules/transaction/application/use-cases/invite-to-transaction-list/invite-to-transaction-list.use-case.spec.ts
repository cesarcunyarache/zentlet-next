import { describe, expect, it } from 'vitest';
import {
  TransactionListForbiddenError,
  TransactionListNotFoundError,
  TransactionListPrivateError,
} from '../../../domain/transaction-list.errors.js';
import type { TransactionList } from '../../../domain/transaction-list/transaction-list.js';
import { InMemoryTransactionListRepository } from '../../../infrastructure/transaction-list/in-memory-transaction-list.repository.js';
import { InMemoryTransactionListInviteRepository } from '../../../infrastructure/transaction-list-invite/in-memory-transaction-list-invite.repository.js';
import { InMemoryTransactionListMemberRepository } from '../../../infrastructure/transaction-list-member/in-memory-transaction-list-member.repository.js';
import { InviteTokenService } from '../../services/invite-token.service.js';
import { InviteToTransactionListUseCase } from './invite-to-transaction-list.use-case.js';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

function makeUseCase() {
  const transactionListRepository = new InMemoryTransactionListRepository();
  const transactionListMemberRepository = new InMemoryTransactionListMemberRepository();
  const transactionListInviteRepository = new InMemoryTransactionListInviteRepository(transactionListMemberRepository);
  const inviteTokenService = new InviteTokenService();

  const list: TransactionList = {
    id: LIST_ID,
    ownerId: OWNER_ID,
    privateOwnerId: null,
    currency: 'PEN',
    name: 'Shared list',
    icon: '👥',
    color: '#fff',
  };
  transactionListRepository.seedList(list);
  transactionListMemberRepository.seedMember(LIST_ID, OWNER_ID, 'owner');

  const useCase = new InviteToTransactionListUseCase(
    transactionListInviteRepository,
    transactionListRepository,
    transactionListMemberRepository,
    inviteTokenService,
  );

  return { useCase, transactionListRepository, transactionListMemberRepository, transactionListInviteRepository, list };
}

describe('InviteToTransactionListUseCase', () => {
  it('creates an invite and returns the plaintext token exactly once', async () => {
    const { useCase, transactionListInviteRepository } = makeUseCase();

    const result = await useCase.execute({ userId: OWNER_ID, listId: LIST_ID, role: 'editor' });

    expect(result.token).toBeTypeOf('string');
    expect(result.invite.role).toBe('editor');

    const stored = await transactionListInviteRepository.findByTokenHash(
      new InviteTokenService().hash(result.token),
    );
    expect(stored?.id).toBe(result.invite.id);

    // The fake repository never stores the raw token anywhere reachable through its public port.
    const serialized = JSON.stringify(await transactionListInviteRepository.findActive(LIST_ID, new Date()));
    expect(serialized.includes(result.token)).toBe(false);
  });

  it('rejects a caller who is not a member', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({ userId: 'stranger', listId: LIST_ID, role: 'editor' })).rejects.toThrow(
      TransactionListNotFoundError,
    );
  });

  it('rejects an editor or viewer inviting others', async () => {
    const { useCase, transactionListMemberRepository } = makeUseCase();
    await transactionListMemberRepository.create(LIST_ID, 'editor-1', 'editor');

    await expect(useCase.execute({ userId: 'editor-1', listId: LIST_ID, role: 'viewer' })).rejects.toThrow(
      TransactionListForbiddenError,
    );
  });

  it('rejects inviting to a private list', async () => {
    const { useCase, transactionListRepository, transactionListMemberRepository } = makeUseCase();
    const privateList: TransactionList = {
      id: 'private-list',
      ownerId: OWNER_ID,
      privateOwnerId: OWNER_ID,
      currency: 'PEN',
      name: 'Private list',
      icon: '🔒',
      color: '#E2E8F0',
    };
    transactionListRepository.seedList(privateList);
    transactionListMemberRepository.seedMember('private-list', OWNER_ID, 'owner');

    await expect(useCase.execute({ userId: OWNER_ID, listId: 'private-list', role: 'editor' })).rejects.toThrow(
      TransactionListPrivateError,
    );
  });
});
