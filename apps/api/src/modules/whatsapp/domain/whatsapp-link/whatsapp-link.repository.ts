import type { Conversation, WhatsappLink } from './whatsapp-link.js';

export abstract class WhatsappLinkRepository {
  abstract findByUserId(userId: string): Promise<WhatsappLink | null>;
  abstract findByPhone(phone: string): Promise<WhatsappLink | null>;
  // One phone per user and one user per phone: linking again replaces whatever
  // the user or the phone was previously linked to.
  abstract link(userId: string, phone: string): Promise<void>;
  abstract unlink(userId: string): Promise<boolean>;
  abstract saveConversation(userId: string, conversation: Conversation, expiresAt: Date): Promise<void>;
}
