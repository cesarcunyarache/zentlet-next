import type { Conversation } from "../../../types";
import type { WhatsappLink } from "../entities/whatsapp-link.entity";

export interface WhatsappRepository {
  findByUser(userId: string): Promise<WhatsappLink | null>;
  findByPhone(phone: string): Promise<WhatsappLink | null>;
  saveLinkCode(userId: string, codeHash: string, expiresAt: Date): Promise<void>;
  consumeLinkCode(codeHash: string, now: Date): Promise<string | null>;
  link(userId: string, phone: string): Promise<void>;
  unlinkUser(userId: string): Promise<boolean>;
  saveConversation(userId: string, conversation: Conversation, expiresAt: Date, now: Date): Promise<void>;
  markMessageSeen(messageId: string): Promise<boolean>;
}
