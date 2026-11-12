import { Injectable } from '@nestjs/common';
import type { InboxSender } from '../../domain/inbox-sender/inbox-sender.js';
import { InboxSenderRepository } from '../../domain/inbox-sender/inbox-sender.repository.js';

@Injectable()
export class InMemoryInboxSenderRepository extends InboxSenderRepository {
  private readonly senders = new Map<string, InboxSender>();

  async findAll(userId: string): Promise<InboxSender[]> {
    return [...this.senders.values()].filter((sender) => sender.userId === userId);
  }

  async findRules(userId: string): Promise<InboxSender[]> {
    return this.findAll(userId);
  }

  async trust(userId: string, address: string): Promise<InboxSender> {
    const sender = this.upsert(userId, address, { status: 'trusted', origin: 'manual' });
    return sender;
  }

  async recordAcceptance(userId: string, address: string): Promise<InboxSender> {
    const existing = this.findOne(userId, address);
    return this.upsert(userId, address, { acceptedCount: (existing?.acceptedCount ?? 0) + 1 });
  }

  async recordDismissal(userId: string, address: string): Promise<InboxSender> {
    const existing = this.findOne(userId, address);
    return this.upsert(userId, address, { dismissedCount: (existing?.dismissedCount ?? 0) + 1 });
  }

  async block(id: string): Promise<void> {
    const sender = this.senders.get(id);
    if (sender) this.senders.set(id, { ...sender, status: 'blocked' });
  }

  async deleteOwned(userId: string, id: string): Promise<'deleted' | 'not_found'> {
    const sender = this.senders.get(id);
    if (!sender || sender.userId !== userId) return 'not_found';
    this.senders.delete(id);
    return 'deleted';
  }

  private findOne(userId: string, address: string): InboxSender | null {
    return [...this.senders.values()].find((sender) => sender.userId === userId && sender.address === address) ?? null;
  }

  private upsert(userId: string, address: string, patch: Partial<InboxSender>): InboxSender {
    const existing = this.findOne(userId, address);
    const sender: InboxSender = {
      id: existing?.id ?? crypto.randomUUID(),
      userId,
      address,
      status: 'trusted',
      origin: 'learned',
      acceptedCount: 0,
      dismissedCount: 0,
      createdAt: existing?.createdAt ?? new Date(),
      ...existing,
      ...patch,
    };
    this.senders.set(sender.id, sender);
    return sender;
  }
}
