import { Injectable } from '@nestjs/common';
import type { EmailInbox, EmailVerification } from '../../domain/email-inbox/email-inbox.js';
import { EmailInboxRepository } from '../../domain/email-inbox/email-inbox.repository.js';

@Injectable()
export class InMemoryEmailInboxRepository extends EmailInboxRepository {
  private readonly inboxes = new Map<string, EmailInbox>();

  async findByUser(userId: string): Promise<EmailInbox | null> {
    return [...this.inboxes.values()].find((inbox) => inbox.userId === userId) ?? null;
  }

  async findByAddresses(addresses: string[]): Promise<EmailInbox | null> {
    return [...this.inboxes.values()].find((inbox) => addresses.includes(inbox.address)) ?? null;
  }

  async insert(userId: string, address: string): Promise<EmailInbox | 'conflict'> {
    const taken = [...this.inboxes.values()].some((inbox) => inbox.address === address);
    if (taken) return 'conflict';

    const inbox: EmailInbox = { id: crypto.randomUUID(), userId, address, verificationCode: null, verificationUrl: null, lastReceivedAt: null };
    this.inboxes.set(inbox.id, inbox);
    return inbox;
  }

  async recordReceipt(id: string, receivedAt: Date, verification: EmailVerification | null): Promise<void> {
    const inbox = this.inboxes.get(id);
    if (!inbox) return;
    this.inboxes.set(id, {
      ...inbox,
      lastReceivedAt: receivedAt,
      ...(verification ? { verificationCode: verification.code, verificationUrl: verification.url } : {}),
    });
  }
}
