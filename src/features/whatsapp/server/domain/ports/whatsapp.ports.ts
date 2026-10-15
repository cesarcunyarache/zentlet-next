import type { Locale } from "@/i18n/routing";
import type { TransactionSummary } from "@/features/transaction/types";
import type { ReadyMovement } from "../../../lib/conversation";
import type { Translate } from "../../../lib/replies";
import type {
  ChatCategory,
  ChatProfile,
  InterpretationRequest,
  InterpretationResult,
  MediaFile,
  Period,
  ReceiptResult,
  Reply,
} from "../../../types";

export interface WhatsappMessenger {
  send(to: string, reply: Reply): Promise<void>;
  markRead(messageId: string): Promise<void>;
  downloadMedia(mediaId: string): Promise<MediaFile | null>;
}

export interface Ledger {
  profile(userId: string): Promise<ChatProfile>;
  categories(userId: string): Promise<ChatCategory[]>;
  record(userId: string, id: string, movement: ReadyMovement): Promise<boolean>;
  remove(userId: string, ids: string[]): Promise<number>;
  summarize(userId: string, period: Period): Promise<TransactionSummary>;
}

export interface MessageInterpreter {
  interpret(userId: string, request: InterpretationRequest, audio: MediaFile | null): Promise<InterpretationResult>;
  readReceipt(userId: string, image: MediaFile, categories: ChatCategory[], today: string): Promise<ReceiptResult>;
}

export interface Throttle {
  allow(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export type TextsFor = (locale: Locale) => Translate;
