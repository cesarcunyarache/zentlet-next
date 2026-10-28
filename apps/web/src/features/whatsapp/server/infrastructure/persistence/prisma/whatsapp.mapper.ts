import { z } from "zod";
import type { WhatsappLink as WhatsappLinkRow } from "@/generated/prisma/client";
import type { Conversation } from "../../../../types";
import type { WhatsappLink } from "../../../domain/entities/whatsapp-link.entity";

const movementSchema = z.object({
  type: z.enum(["expense", "income"]).nullable(),
  amount: z.number().nullable(),
  categoryId: z.string().nullable(),
  description: z.string().nullable(),
  date: z.string().nullable(),
});

const storedConversation = z
  .object({
    drafts: z.array(movementSchema),
    lastRecorded: z.array(z.string()),
    history: z.array(z.object({ from: z.enum(["user", "bot"]), text: z.string() })),
  })
  .nullable()
  .catch(null);

function activeConversation(row: WhatsappLinkRow, now: Date): Conversation | null {
  if (!row.conversationExpiresAt || row.conversationExpiresAt <= now) return null;
  return storedConversation.parse(row.conversation);
}

export function toDomain(row: WhatsappLinkRow, now = new Date()): WhatsappLink {
  return {
    userId: row.userId,
    phone: row.phone,
    conversation: activeConversation(row, now),
    createdAt: row.createdAt,
  };
}
