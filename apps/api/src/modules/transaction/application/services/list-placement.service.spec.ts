import { describe, expect, it } from 'vitest';
import { InMemoryTransactionListRepository } from '../../infrastructure/transaction-list/in-memory-transaction-list.repository.js';
import { ListPlacementService } from './list-placement.service.js';

const USER_ID = 'user-1';

describe('ListPlacementService', () => {
  it('creates and uses the private list when no list is requested', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);

    const listId = await service.resolveTargetListId(USER_ID, null);

    const privateList = await repository.findPrivateList(USER_ID);
    expect(privateList?.id).toBe(listId);
  });

  it('reuses an already-created private list on a second call', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);

    const first = await service.resolveTargetListId(USER_ID, null);
    const second = await service.resolveTargetListId(USER_ID, null);

    expect(second).toBe(first);
  });

  it('uses the requested list when the caller is its owner', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);
    const ownPrivateList = await repository.ensurePrivateList(USER_ID);

    const listId = await service.resolveTargetListId(USER_ID, ownPrivateList.id);

    expect(listId).toBe(ownPrivateList.id);
  });

  it('uses a shared list when the caller is an editor and the currency matches the private list', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);
    await repository.ensurePrivateList(USER_ID); // currency defaults to PEN

    repository.seedList({
      id: 'shared-list',
      ownerId: 'user-2',
      privateOwnerId: null,
      currency: 'PEN',
      name: 'Shared',
      icon: 'list',
      color: '#000',
    });
    repository.seedMember('shared-list', USER_ID, 'editor');

    const listId = await service.resolveTargetListId(USER_ID, 'shared-list');

    expect(listId).toBe('shared-list');
  });

  it('falls back to the private list when the caller is only a viewer', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);
    const privateList = await repository.ensurePrivateList(USER_ID);

    repository.seedList({
      id: 'shared-list',
      ownerId: 'user-2',
      privateOwnerId: null,
      currency: 'PEN',
      name: 'Shared',
      icon: 'list',
      color: '#000',
    });
    repository.seedMember('shared-list', USER_ID, 'viewer');

    const listId = await service.resolveTargetListId(USER_ID, 'shared-list');

    expect(listId).toBe(privateList.id);
  });

  it('falls back to the private list when the requested list has a different currency', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);
    const privateList = await repository.ensurePrivateList(USER_ID); // PEN

    repository.seedList({
      id: 'shared-list',
      ownerId: 'user-2',
      privateOwnerId: null,
      currency: 'USD',
      name: 'Shared',
      icon: 'list',
      color: '#000',
    });
    repository.seedMember('shared-list', USER_ID, 'editor');

    const listId = await service.resolveTargetListId(USER_ID, 'shared-list');

    expect(listId).toBe(privateList.id);
  });

  it('falls back to the private list when the caller has no membership on the requested list', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);
    const privateList = await repository.ensurePrivateList(USER_ID);

    const listId = await service.resolveTargetListId(USER_ID, 'does-not-exist');

    expect(listId).toBe(privateList.id);
  });

  it('falls back to the private list when the requested list is archived', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);
    const privateList = await repository.ensurePrivateList(USER_ID);

    repository.seedList({
      id: 'shared-list',
      ownerId: 'user-2',
      privateOwnerId: null,
      currency: 'PEN',
      name: 'Shared',
      icon: 'list',
      color: '#000',
    });
    repository.seedMember('shared-list', USER_ID, 'editor');
    repository.archive('shared-list');

    const listId = await service.resolveTargetListId(USER_ID, 'shared-list');

    expect(listId).toBe(privateList.id);
  });

  it('never fails on a concurrent private-list creation race: both callers resolve to the same list', async () => {
    const repository = new InMemoryTransactionListRepository();
    const service = new ListPlacementService(repository);

    const [first, second] = await Promise.all([
      service.resolveTargetListId(USER_ID, null),
      service.resolveTargetListId(USER_ID, null),
    ]);

    expect(first).toBe(second);
  });
});
