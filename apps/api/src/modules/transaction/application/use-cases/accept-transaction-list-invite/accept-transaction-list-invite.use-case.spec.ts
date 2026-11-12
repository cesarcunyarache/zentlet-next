import { beforeEach, describe, expect, it } from 'vitest';
import { TransactionListInviteInvalidError } from '../../../domain/transaction-list.errors.js';
import { InMemoryTransactionListInviteRepository } from '../../../infrastructure/transaction-list-invite/in-memory-transaction-list-invite.repository.js';
import { InMemoryTransactionListMemberRepository } from '../../../infrastructure/transaction-list-member/in-memory-transaction-list-member.repository.js';
import { InviteTokenService } from '../../services/invite-token.service.js';
import { AcceptTransactionListInviteUseCase } from './accept-transaction-list-invite.use-case.js';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';
const TOKEN = 'plain-text-invite-token';
const NOW = new Date('2026-01-10T00:00:00Z');

function makeUseCase() {
  const transactionListMemberRepository = new InMemoryTransactionListMemberRepository();
  const transactionListInviteRepository = new InMemoryTransactionListInviteRepository(transactionListMemberRepository);
  const inviteTokenService = new InviteTokenService();

  transactionListMemberRepository.seedMember(LIST_ID, OWNER_ID, 'owner');

  const useCase = new AcceptTransactionListInviteUseCase(
    transactionListInviteRepository,
    transactionListMemberRepository,
    inviteTokenService,
  );

  return { useCase, transactionListMemberRepository, transactionListInviteRepository, inviteTokenService };
}

function seedInvite(
  repository: InMemoryTransactionListInviteRepository,
  hash: string,
  overrides: Partial<{ expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null; role: 'editor' | 'viewer' }> = {},
) {
  repository.seedInvite({
    id: crypto.randomUUID(),
    listId: LIST_ID,
    role: overrides.role ?? 'editor',
    email: null,
    expiresAt: overrides.expiresAt ?? new Date('2026-02-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    acceptedAt: overrides.acceptedAt ?? null,
    revokedAt: overrides.revokedAt ?? null,
    tokenHash: hash,
  });
}

describe('AcceptTransactionListInviteUseCase', () => {
  let setup: ReturnType<typeof makeUseCase>;

  beforeEach(() => {
    setup = makeUseCase();
  });

  it('joins the list and creates the membership row', async () => {
    const { useCase, transactionListInviteRepository, transactionListMemberRepository, inviteTokenService } = setup;
    seedInvite(transactionListInviteRepository, inviteTokenService.hash(TOKEN));

    const result = await useCase.execute({ userId: 'new-member', token: TOKEN }, NOW);

    expect(result).toEqual({ listId: LIST_ID, joined: true });
    const membership = await transactionListMemberRepository.find(LIST_ID, 'new-member');
    expect(membership?.role).toBe('editor');
  });

  it('rejects an unknown token', async () => {
    const { useCase } = setup;

    await expect(useCase.execute({ userId: 'new-member', token: 'unknown' }, NOW)).rejects.toThrow(
      TransactionListInviteInvalidError,
    );
  });

  it('rejects an expired invite', async () => {
    const { useCase, transactionListInviteRepository, inviteTokenService } = setup;
    seedInvite(transactionListInviteRepository, inviteTokenService.hash(TOKEN), { expiresAt: new Date('2026-01-01T00:00:00Z') });

    await expect(useCase.execute({ userId: 'new-member', token: TOKEN }, NOW)).rejects.toThrow(
      TransactionListInviteInvalidError,
    );
  });

  it('rejects a revoked invite', async () => {
    const { useCase, transactionListInviteRepository, inviteTokenService } = setup;
    seedInvite(transactionListInviteRepository, inviteTokenService.hash(TOKEN), { revokedAt: new Date('2026-01-02T00:00:00Z') });

    await expect(useCase.execute({ userId: 'new-member', token: TOKEN }, NOW)).rejects.toThrow(
      TransactionListInviteInvalidError,
    );
  });

  it('rejects accepting the same invite twice', async () => {
    const { useCase, transactionListInviteRepository, inviteTokenService } = setup;
    seedInvite(transactionListInviteRepository, inviteTokenService.hash(TOKEN), { acceptedAt: new Date('2026-01-05T00:00:00Z') });

    await expect(useCase.execute({ userId: 'new-member', token: TOKEN }, NOW)).rejects.toThrow(
      TransactionListInviteInvalidError,
    );
  });

  it('is idempotent when the caller is already a member', async () => {
    const { useCase, transactionListInviteRepository, inviteTokenService } = setup;
    seedInvite(transactionListInviteRepository, inviteTokenService.hash(TOKEN));

    const result = await useCase.execute({ userId: OWNER_ID, token: TOKEN }, NOW);

    expect(result).toEqual({ listId: LIST_ID, joined: false });
  });
});
