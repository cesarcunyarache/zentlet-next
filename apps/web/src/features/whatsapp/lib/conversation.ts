import type { Locale } from "@/i18n/routing";
import { roundToCents } from "@/lib/money";
import { isoDate } from "@/features/transaction/schemas/transaction-api.schema";
import { matchCategory, normalize } from "@/features/transaction/lib/parse-description";
import { LANGUAGES } from "@/features/transaction/lib/parse-voice";
import { findAmount } from "@/features/transaction/lib/voice/amount";
import type { ChatCategory, Conversation, Movement, Turn } from "../types";

const MAX_HISTORY = 6;
const MAX_TURN_LENGTH = 300;
const MAX_DRAFTS = 5;
const MAX_AMOUNT = 9_999_999_999;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_ANSWER_LEFTOVER = 12;
const MAX_CATEGORY_ANSWER_WORDS = 3;

const CATEGORY_CHOICE = "cat:";
const UNDO_CHOICE = "undo:";
const CANCEL_CHOICE = "cancel";

export type MissingField = "amount" | "category";

export interface ReadyMovement {
  type: "expense" | "income";
  amount: number;
  categoryId: string;
  description: string;
  date: string;
}

export type Choice =
  | { kind: "category"; categoryId: string }
  | { kind: "undo"; ids: string[] }
  | { kind: "cancel" };

export const emptyConversation = (): Conversation => ({ drafts: [], lastRecorded: [], history: [] });

export const emptyMovement = (): Movement => ({
  type: null,
  amount: null,
  categoryId: null,
  description: null,
  date: null,
});

export function withTurn(conversation: Conversation, from: Turn["from"], text: string): Conversation {
  const turn = { from, text: text.trim().slice(0, MAX_TURN_LENGTH) };
  return { ...conversation, history: [...conversation.history, turn].slice(-MAX_HISTORY) };
}

function validAmount(amount: number | null) {
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;
  const cents = roundToCents(amount);
  return cents > 0 && cents <= MAX_AMOUNT ? cents : null;
}

export function sanitizeMovement(movement: Movement, categories: ChatCategory[]): Movement {
  const description = movement.description?.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null;
  return {
    type: movement.type === "income" || movement.type === "expense" ? movement.type : null,
    amount: validAmount(movement.amount),
    categoryId: categories.some((category) => category.id === movement.categoryId) ? movement.categoryId : null,
    description,
    date: movement.date && isoDate.safeParse(movement.date).success ? movement.date : null,
  };
}

export function sanitizeMovements(movements: Movement[], categories: ChatCategory[]) {
  return movements
    .slice(0, MAX_DRAFTS)
    .map((movement) => sanitizeMovement(movement, categories))
    .filter((movement) => movement.amount !== null || movement.description !== null);
}

export function mergeMovement(base: Movement, patch: Movement): Movement {
  return {
    type: patch.type ?? base.type,
    amount: patch.amount ?? base.amount,
    categoryId: patch.categoryId ?? base.categoryId,
    description: base.description ?? patch.description,
    date: patch.date ?? base.date,
  };
}

export function missingField(movement: Movement): MissingField | null {
  if (movement.amount === null) return "amount";
  if (movement.categoryId === null) return "category";
  return null;
}

export function splitReady(drafts: Movement[]) {
  return {
    ready: drafts.filter((draft) => missingField(draft) === null),
    pending: drafts.filter((draft) => missingField(draft) !== null),
  };
}

export function toReadyMovement(movement: Movement, today: string, categories: ChatCategory[]): ReadyMovement {
  const category = categories.find(({ id }) => id === movement.categoryId);
  return {
    type: movement.type ?? "expense",
    amount: movement.amount ?? 0,
    categoryId: movement.categoryId ?? "",
    description: movement.description ?? category?.name ?? "",
    date: movement.date ?? today,
  };
}

function answeredAmount(text: string, locale: Locale): Movement | null {
  const amount = findAmount(text, LANGUAGES[locale]);
  if (!amount) return null;
  const leftover = text.replace(amount.match, "").trim();
  return leftover.length <= MAX_ANSWER_LEFTOVER ? { ...emptyMovement(), amount: validAmount(amount.value) } : null;
}

function answeredCategory(text: string, categories: ChatCategory[]): Movement | null {
  const clean = normalize(text);
  const exact = categories.find((category) => normalize(category.name) === clean);
  if (exact) return { ...emptyMovement(), categoryId: exact.id };
  if (clean.split(/\s+/).length > MAX_CATEGORY_ANSWER_WORDS) return null;
  const categoryId = matchCategory(clean, categories);
  return categoryId ? { ...emptyMovement(), categoryId } : null;
}

export function quickAnswer(text: string, missing: MissingField, categories: ChatCategory[], locale: Locale) {
  return missing === "amount" ? answeredAmount(text, locale) : answeredCategory(text, categories);
}

export const categoryChoiceId = (categoryId: string) => `${CATEGORY_CHOICE}${categoryId}`;

export const undoChoiceId = (ids: string[]) => `${UNDO_CHOICE}${ids.join(",")}`;

export const cancelChoiceId = () => CANCEL_CHOICE;

export function parseChoice(choiceId: string): Choice | null {
  if (choiceId === CANCEL_CHOICE) return { kind: "cancel" };
  if (choiceId.startsWith(CATEGORY_CHOICE)) return { kind: "category", categoryId: choiceId.slice(CATEGORY_CHOICE.length) };
  if (choiceId.startsWith(UNDO_CHOICE)) {
    const ids = choiceId.slice(UNDO_CHOICE.length).split(",").filter(Boolean);
    return ids.length ? { kind: "undo", ids } : null;
  }
  return null;
}
