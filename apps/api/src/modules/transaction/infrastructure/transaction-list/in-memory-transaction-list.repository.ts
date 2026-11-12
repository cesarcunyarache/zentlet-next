import { Injectable } from '@nestjs/common';
import type { ListMembership, NewTransactionList, TransactionList } from '../../domain/transaction-list/transaction-list.js';
import { TransactionListRepository } from '../../domain/transaction-list/transaction-list.repository.js';

const PRIVATE_LIST_DEFAULTS = { name: 'Private list', icon: '🔒', color: '#E2E8F0' };
const DEFAULT_CURRENCY = 'PEN';

type MemberRow = { listId: string; userId: string; role: ListMembership['role'] };

@Injectable()
export class InMemoryTransactionListRepository extends TransactionListRepository {
  private readonly lists = new Map<string, TransactionList>();
  private readonly members: MemberRow[] = [];
  private readonly archived = new Set<string>();
  // Stands in for the DB's unique-constraint race guard: dedupes concurrent
  // `ensurePrivateList` calls for the same user onto a single creation.
  private readonly creating = new Map<string, Promise<TransactionList>>();

  async findPrivateList(userId: string): Promise<TransactionList | null> {
    return [...this.lists.values()].find((list) => list.privateOwnerId === userId) ?? null;
  }

  async ensurePrivateList(userId: string): Promise<TransactionList> {
    const existing = await this.findPrivateList(userId);
    if (existing) return existing;

    const inFlight = this.creating.get(userId);
    if (inFlight) return inFlight;

    const creation = this.createPrivateList(userId).finally(() => this.creating.delete(userId));
    this.creating.set(userId, creation);
    return creation;
  }

  private async createPrivateList(userId: string): Promise<TransactionList> {
    const list: TransactionList = {
      id: crypto.randomUUID(),
      ownerId: userId,
      privateOwnerId: userId,
      currency: DEFAULT_CURRENCY,
      ...PRIVATE_LIST_DEFAULTS,
    };
    this.lists.set(list.id, list);
    this.members.push({ listId: list.id, userId, role: 'owner' });
    return list;
  }

  async findMembership(listId: string, userId: string): Promise<ListMembership | null> {
    const list = this.lists.get(listId);
    if (!list) return null;
    const member = this.members.find((row) => row.listId === listId && row.userId === userId);
    if (!member) return null;

    return {
      role: member.role,
      list: {
        currency: list.currency,
        privateOwnerId: list.privateOwnerId,
        archivedAt: this.archived.has(listId) ? new Date() : null,
      },
    };
  }

  async findById(listId: string): Promise<TransactionList | null> {
    return this.lists.get(listId) ?? null;
  }

  async create(input: NewTransactionList): Promise<TransactionList | 'id_taken'> {
    if (this.lists.has(input.id)) return 'id_taken';

    const list: TransactionList = {
      id: input.id,
      ownerId: input.ownerId,
      privateOwnerId: null,
      currency: input.currency,
      name: input.name,
      icon: input.icon,
      color: input.color,
    };
    this.lists.set(list.id, list);
    this.members.push({ listId: list.id, userId: input.ownerId, role: 'owner' });
    return list;
  }

  // Test helpers — not part of the port, only used to set up fixtures.
  seedList(list: TransactionList): void {
    this.lists.set(list.id, list);
  }

  seedMember(listId: string, userId: string, role: ListMembership['role']): void {
    this.members.push({ listId, userId, role });
  }

  archive(listId: string): void {
    this.archived.add(listId);
  }
}
