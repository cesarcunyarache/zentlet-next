import { Injectable } from '@nestjs/common';
import { WhatsappMessageRepository } from '../domain/whatsapp-message/whatsapp-message.repository.js';

@Injectable()
export class InMemoryWhatsappMessageRepository extends WhatsappMessageRepository {
  private readonly seen = new Set<string>();

  async markSeen(id: string): Promise<boolean> {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    return true;
  }
}
