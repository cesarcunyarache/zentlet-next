import { Injectable } from '@nestjs/common';
import type { Conversation, WhatsappLink } from '../domain/whatsapp-link/whatsapp-link.js';
import { WhatsappLinkRepository } from '../domain/whatsapp-link/whatsapp-link.repository.js';

@Injectable()
export class InMemoryWhatsappLinkRepository extends WhatsappLinkRepository {
  private readonly byUserId = new Map<string, WhatsappLink>();

  async findByUserId(userId: string): Promise<WhatsappLink | null> {
    return this.byUserId.get(userId) ?? null;
  }

  async findByPhone(phone: string): Promise<WhatsappLink | null> {
    return [...this.byUserId.values()].find((link) => link.phone === phone) ?? null;
  }

  async link(userId: string, phone: string): Promise<void> {
    for (const [existingUserId, link] of this.byUserId) {
      if (link.phone === phone && existingUserId !== userId) this.byUserId.delete(existingUserId);
    }
    this.byUserId.set(userId, { userId, phone, conversation: null, createdAt: new Date() });
  }

  async unlink(userId: string): Promise<boolean> {
    return this.byUserId.delete(userId);
  }

  async saveConversation(userId: string, conversation: Conversation): Promise<void> {
    const link = this.byUserId.get(userId);
    if (!link) return;
    this.byUserId.set(userId, { ...link, conversation });
  }
}
