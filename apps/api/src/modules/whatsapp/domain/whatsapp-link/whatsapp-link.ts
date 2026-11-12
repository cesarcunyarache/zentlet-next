export type MovementType = 'expense' | 'income';

export type PendingMovement = {
  type: MovementType | null;
  amount: number | null;
  categoryId: string | null;
  description: string | null;
};

export type ConversationTurn = {
  from: 'user' | 'bot';
  text: string;
};

export type Conversation = {
  pending: PendingMovement | null;
  lastRecordedId: string | null;
  history: ConversationTurn[];
};

export type WhatsappLink = {
  userId: string;
  phone: string;
  conversation: Conversation | null;
  createdAt: Date;
};

export const CONVERSATION_TTL_MS = 30 * 60_000;

export const emptyConversation = (): Conversation => ({ pending: null, lastRecordedId: null, history: [] });

export const emptyPendingMovement = (): PendingMovement => ({
  type: null,
  amount: null,
  categoryId: null,
  description: null,
});
