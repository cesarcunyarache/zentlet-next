import { vi } from "vitest";
import type { Conversation, Interpretation, InterpretationResult, Reply } from "../../../../types";
import type { WhatsappLink } from "../../../domain/entities/whatsapp-link.entity";
import type { Ledger, MessageInterpreter, Throttle, WhatsappMessenger } from "../../../domain/ports/whatsapp.ports";
import type { WhatsappRepository } from "../../../domain/repositories/whatsapp.repository";

export const USER = "user-1";
export const PHONE = "51987654321";
export const TODAY = "2026-10-15";

export const CATEGORIES = [
  { id: "food", name: "Comida" },
  { id: "transport", name: "Transporte" },
];

export function fakeLinks(initial: { linked?: boolean; codeUserId?: string | null } = {}) {
  const seen = new Set<string>();
  const state: { link: WhatsappLink | null; conversation: Conversation | null } = {
    link: initial.linked === false ? null : { userId: USER, phone: PHONE, conversation: null, createdAt: new Date() },
    conversation: null,
  };
  const repository: WhatsappRepository = {
    findByUser: vi.fn(async () => state.link),
    findByPhone: vi.fn(async (phone: string) =>
      state.link?.phone === phone ? { ...state.link, conversation: state.conversation } : null,
    ),
    saveLinkCode: vi.fn(async () => {}),
    consumeLinkCode: vi.fn(async () => initial.codeUserId ?? null),
    link: vi.fn(async (userId: string, phone: string) => {
      state.link = { userId, phone, conversation: null, createdAt: new Date() };
    }),
    unlinkUser: vi.fn(async () => {
      const had = state.link !== null;
      state.link = null;
      return had;
    }),
    saveConversation: vi.fn(async (_userId: string, conversation: Conversation) => {
      state.conversation = conversation;
    }),
    markMessageSeen: vi.fn(async (id: string) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  };
  return { repository, state };
}

export function fakeMessenger() {
  const sent: Reply[] = [];
  const messenger: WhatsappMessenger = {
    send: vi.fn(async (_to: string, reply: Reply) => {
      sent.push(reply);
    }),
    markRead: vi.fn(async () => {}),
    downloadMedia: vi.fn(async () => ({ data: new Uint8Array([1, 2, 3]), mediaType: "audio/ogg" })),
  };
  return { messenger, sent };
}

export function fakeLedger(overrides: Partial<Ledger> = {}): Ledger {
  return {
    profile: vi.fn(async () => ({ name: "Ana", locale: "es" as const, currency: "S/", today: TODAY })),
    categories: vi.fn(async () => CATEGORIES),
    record: vi.fn(async () => true),
    remove: vi.fn(async (_userId: string, ids: string[]) => ids.length),
    summarize: vi.fn(async () => ({
      count: 3,
      expenseTotal: 120,
      incomeTotal: 1500,
      byCategory: { food: { expense: 80, income: 0 }, transport: { expense: 40, income: 0 } },
    })),
    ...overrides,
  };
}

export const understood = (interpretation: Partial<Interpretation>): InterpretationResult => ({
  ok: true,
  interpretation: { intent: "record", movements: [], period: null, reply: null, ...interpretation },
});

export function fakeInterpreter(...results: InterpretationResult[]): MessageInterpreter {
  const interpret = vi.fn<MessageInterpreter["interpret"]>();
  for (const result of results) interpret.mockResolvedValueOnce(result);
  interpret.mockResolvedValue({ ok: false, error: "failed" });
  return {
    interpret,
    readReceipt: vi.fn(async () => ({ ok: false as const, error: "not_receipt" as const })),
  };
}

export const allowAll: Throttle = { allow: vi.fn(async () => true) };

export const echoTexts = () => (key: string, values?: Record<string, string | number>) =>
  values ? `${key} ${JSON.stringify(values)}` : key;
