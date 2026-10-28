import type { TransactionType } from "@/features/transaction/types";
import type { TInboxItem } from "../types";

export interface InboxDraft {
  type: TransactionType;
  description: string;
  rawAmount: string;
  categoryId: string | null;
}

export function toInboxDraft(item: TInboxItem): InboxDraft {
  return {
    type: item.type,
    description: item.description,
    rawAmount: item.amount === null ? "" : item.amount.toFixed(2),
    categoryId: item.categoryId,
  };
}

export function parseDraftAmount(raw: string) {
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

export function toAcceptValues(item: TInboxItem, draft: InboxDraft, fallbackDescription: string) {
  const amount = parseDraftAmount(draft.rawAmount);
  if (amount === null || !draft.categoryId) return null;
  return {
    type: draft.type,
    amount,
    categoryId: draft.categoryId,
    description: draft.description.trim() || fallbackDescription,
    transactionDate: item.transactionDate,
  };
}

export function isDraftEdited(item: TInboxItem, draft: InboxDraft) {
  const original = toInboxDraft(item);
  return (Object.keys(original) as (keyof InboxDraft)[]).some((key) => original[key] !== draft[key]);
}
