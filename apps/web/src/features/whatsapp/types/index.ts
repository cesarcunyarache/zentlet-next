import type { Locale } from "@/i18n/routing";
import type { TransactionType } from "@/features/transaction/types";

export interface TWhatsappConnection {
  isAvailable: boolean;
  phone: string | null;
  linkedAt: string | null;
}

export interface TWhatsappLinkCode {
  code: string;
  url: string;
  expiresAt: string;
}

export interface Movement {
  type: TransactionType | null;
  amount: number | null;
  categoryId: string | null;
  description: string | null;
  date: string | null;
}

export interface Turn {
  from: "user" | "bot";
  text: string;
}

export interface Conversation {
  drafts: Movement[];
  lastRecorded: string[];
  history: Turn[];
}

interface MessageBase {
  id: string;
  from: string;
}

export type IncomingMessage = MessageBase &
  (
    | { kind: "text"; text: string }
    | { kind: "choice"; choiceId: string }
    | { kind: "audio"; mediaId: string }
    | { kind: "image"; mediaId: string; caption: string | null }
    | { kind: "unsupported" }
  );

export type Intent = "record" | "answer" | "cancel" | "undo" | "summary" | "help" | "chat";

export interface Period {
  from: string;
  to: string;
}

export interface Interpretation {
  intent: Intent;
  movements: Movement[];
  period: Partial<Period> | null;
  reply: string | null;
}

export interface ChatProfile {
  name: string;
  locale: Locale;
  currency: string;
  today: string;
}

export interface ChatCategory {
  id: string;
  name: string;
}

export interface ReplyButton {
  id: string;
  title: string;
}

export interface ReplyRow extends ReplyButton {
  description?: string;
}

export type Reply =
  | { kind: "text"; text: string }
  | { kind: "buttons"; text: string; buttons: ReplyButton[] }
  | { kind: "list"; text: string; button: string; rows: ReplyRow[] };

export interface MediaFile {
  data: Uint8Array;
  mediaType: string;
}

export interface InterpretationRequest {
  profile: ChatProfile;
  categories: ChatCategory[];
  pending: Movement | null;
  history: Turn[];
  text: string | null;
}

export type InterpretationResult =
  | { ok: true; interpretation: Interpretation }
  | { ok: false; error: "limited" | "failed" };

export type ReceiptResult = { ok: true; movement: Movement } | { ok: false; error: "not_receipt" | "limited" | "failed" };
