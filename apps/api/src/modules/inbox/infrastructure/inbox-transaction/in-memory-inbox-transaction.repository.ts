import { Injectable } from '@nestjs/common';
import type {
  AcceptedInboxTransactionDraft,
  DateWindow,
  EmailMovement,
  InboxTransaction,
  MatchableCategory,
  NewInboxTransaction,
} from '../../domain/inbox-transaction/inbox-transaction.js';
import { InboxTransactionRepository } from '../../domain/inbox-transaction/inbox-transaction.repository.js';

const MAX_PENDING = 100;

@Injectable()
export class InMemoryInboxTransactionRepository extends InboxTransactionRepository {
  private readonly items = new Map<string, InboxTransaction>();
  private readonly categories = new Map<string, MatchableCategory & { userId: string }>();

  seedCategory(userId: string, category: MatchableCategory): void {
    this.categories.set(category.id, { ...category, userId });
  }

  async findPending(userId: string): Promise<InboxTransaction[]> {
    return [...this.items.values()]
      .filter((item) => item.userId === userId && item.status === 'pending')
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime() || b.receivedAt.getTime() - a.receivedAt.getTime())
      .slice(0, MAX_PENDING);
  }

  async findPendingOwned(userId: string, id: string): Promise<InboxTransaction | null> {
    const item = this.items.get(id);
    return item && item.userId === userId && item.status === 'pending' ? item : null;
  }

  async hasReference(userId: string, reference: string, amount: number): Promise<boolean> {
    return [...this.items.values()].some((item) => item.userId === userId && item.reference === reference && item.amount === amount);
  }

  async insert(item: NewInboxTransaction): Promise<'created' | 'duplicate'> {
    const isDuplicate = [...this.items.values()].some((existing) => existing.userId === item.userId && existing.externalId === item.externalId);
    if (isDuplicate) return 'duplicate';

    const row: InboxTransaction = {
      ...item,
      id: crypto.randomUUID(),
      status: 'pending',
      transactionId: null,
      resolvedAt: null,
      createdAt: new Date(),
    };
    this.items.set(row.id, row);
    return 'created';
  }

  async categoryBelongsTo(userId: string, categoryId: string): Promise<boolean> {
    return this.categories.get(categoryId)?.userId === userId;
  }

  async findMatchableCategories(userId: string): Promise<MatchableCategory[]> {
    return [...this.categories.values()].filter((category) => category.userId === userId).map(({ userId: _userId, ...category }) => category);
  }

  async findSimilarTransactionId(_userId: string, _movement: EmailMovement, _window: DateWindow): Promise<string | null> {
    return null;
  }

  async markDismissed(id: string): Promise<void> {
    const item = this.items.get(id);
    if (item) this.items.set(id, { ...item, status: 'dismissed', resolvedAt: new Date() });
  }

  async markAccepted(item: InboxTransaction, draft: AcceptedInboxTransactionDraft): Promise<void> {
    const current = this.items.get(item.id);
    if (!current) return;
    this.items.set(item.id, { ...current, status: 'accepted', categoryId: draft.categoryId, resolvedAt: new Date() });
  }
}
