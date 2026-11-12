import { z } from 'zod';
import type { WhatsappLink as WhatsappLinkRow } from '../../../generated/prisma/client.js';
import type { Conversation, WhatsappLink } from '../domain/whatsapp-link/whatsapp-link.js';

const pendingMovementSchema = z.object({
  type: z.enum(['expense', 'income']).nullable(),
  amount: z.number().nullable(),
  categoryId: z.string().nullable(),
  description: z.string().nullable(),
});

const conversationSchema = z
  .object({
    pending: pendingMovementSchema.nullable(),
    lastRecordedId: z.string().nullable(),
    history: z.array(z.object({ from: z.enum(['user', 'bot']), text: z.string() })),
  })
  .nullable()
  // A shape that no longer matches (e.g. after a schema change) is treated as
  // no conversation, rather than failing the whole request.
  .catch(null);

function activeConversation(row: WhatsappLinkRow, now: Date): Conversation | null {
  if (!row.conversationExpiresAt || row.conversationExpiresAt <= now) return null;
  return conversationSchema.parse(row.conversation);
}

export function toWhatsappLink(row: WhatsappLinkRow, now = new Date()): WhatsappLink {
  return {
    userId: row.userId,
    phone: row.phone,
    conversation: activeConversation(row, now),
    createdAt: row.createdAt,
  };
}
