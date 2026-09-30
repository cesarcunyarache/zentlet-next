import type { ReceiptExtraction } from "../../ai/schemas/receipt-ai.schema";
import { DESCRIPTION_MAX_LENGTH } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";
import type { VoiceDraft } from "../parse-voice";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AGE_DAYS = 366;
const DAY_MS = 86_400_000;

function toAmount(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

function toDate(value: string | null, today: string) {
  if (!value || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) return today;
  if (value > today) return today;
  const ageDays = (Date.parse(today) - Date.parse(value)) / DAY_MS;
  return ageDays > MAX_AGE_DAYS ? today : value;
}

function toCategoryId(value: string | null, categories: CategoryLike[]) {
  return categories.some((category) => category.id === value) ? value : null;
}

export function toReceiptDraft(extraction: ReceiptExtraction, categories: CategoryLike[], today: string): VoiceDraft {
  return {
    type: extraction.type,
    amount: toAmount(extraction.amount),
    description: extraction.description.trim().slice(0, DESCRIPTION_MAX_LENGTH).trim(),
    categoryId: toCategoryId(extraction.categoryId, categories),
    transactionDate: toDate(extraction.date, today),
  };
}

export function isForeignCurrency(extraction: ReceiptExtraction, currency: string) {
  return Boolean(extraction.currency && extraction.currency.toUpperCase() !== currency.toUpperCase());
}

export type ReceiptError = "not_receipt" | "invalid_image" | "limited" | "failed" | "offline";

export type ReceiptStage = "scanning" | "preview" | "error";
