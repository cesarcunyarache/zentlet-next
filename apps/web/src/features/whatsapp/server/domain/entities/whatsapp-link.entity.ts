import type { Conversation } from "../../../types";

export interface WhatsappLink {
  userId: string;
  phone: string;
  conversation: Conversation | null;
  createdAt: Date;
}

export const LINK_CODE_TTL_MS = 10 * 60_000;
export const CONVERSATION_TTL_MS = 30 * 60_000;
