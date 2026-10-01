import type { Locale } from "@/i18n/routing";
import type { ReceiptExtraction, ScanReceiptResult } from "../../ai/schemas/receipt-ai.schema";
import type { CategoryLike } from "../../types";
import type { ReceiptError } from "./receipt-draft";
import { readReceiptText, type LocalReading } from "./receipt-text";
import { parseSunatQr, sunatSummary, type SunatQr } from "./sunat-qr";

export type ReceiptStep = "qr" | "ocr" | "ai";
export type OcrMode = "auto" | "sparse";
export type ReceiptMethod = "qr" | "ocr" | "ai";

export interface ReceiptReaders {
  decodeQr: () => Promise<string | null>;
  recognizeText: (mode: OcrMode) => Promise<string>;
  scanWithAi: () => Promise<ScanReceiptResult>;
  suggestCategory: (description: string) => Promise<string | null>;
  isOnline: () => boolean;
  onStep: (step: ReceiptStep) => void;
}

export type ReceiptReading =
  | { ok: true; extraction: ReceiptExtraction; method: ReceiptMethod; isCategoryAi: boolean }
  | { ok: false; error: ReceiptError };

const AI_FAILED: ScanReceiptResult = { ok: false, error: "failed" };

async function attempt<T>(read: () => Promise<T>, fallback: T) {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

function withQr(extraction: ReceiptExtraction, qr: SunatQr | null): ReceiptExtraction {
  if (!qr) return extraction;
  return {
    ...extraction,
    isReceipt: true,
    amount: qr.total,
    date: qr.date ?? extraction.date,
    summary: extraction.summary || sunatSummary(qr),
  };
}

function fillGaps(primary: ReceiptExtraction, fallback: ReceiptExtraction): ReceiptExtraction {
  return {
    ...primary,
    amount: primary.amount ?? fallback.amount,
    currency: primary.currency ?? fallback.currency,
    date: primary.date ?? fallback.date,
    summary: primary.summary || fallback.summary,
    description: primary.description || fallback.description,
    categoryId: primary.categoryId ?? fallback.categoryId,
  };
}

function success(extraction: ReceiptExtraction, method: ReceiptMethod, isCategoryAi = false): ReceiptReading {
  return { ok: true, extraction, method, isCategoryAi };
}

async function withSuggestedCategory(extraction: ReceiptExtraction, method: ReceiptMethod, readers: ReceiptReaders) {
  if (extraction.categoryId || !extraction.description || !readers.isOnline()) return success(extraction, method);
  const categoryId = await attempt(() => readers.suggestCategory(extraction.description), null);
  return success({ ...extraction, categoryId }, method, categoryId !== null);
}

async function readWithAi(local: ReceiptExtraction, qr: SunatQr | null, readers: ReceiptReaders): Promise<ReceiptReading> {
  readers.onStep("ai");
  const ai = await attempt(readers.scanWithAi, AI_FAILED);
  if (ai.ok) return success(withQr(fillGaps(ai.extraction, local), qr), "ai", ai.extraction.categoryId !== null);

  const isUsable = ai.error === "not_receipt" ? local.amount !== null : local.isReceipt;
  return isUsable ? success(local, "ocr") : { ok: false, error: ai.error };
}

async function recognize(readers: ReceiptReaders, mode: OcrMode, categories: CategoryLike[], locale: Locale) {
  return readReceiptText(await attempt(() => readers.recognizeText(mode), ""), categories, locale);
}

async function readLocally(readers: ReceiptReaders, categories: CategoryLike[], locale: Locale): Promise<LocalReading> {
  const auto = await recognize(readers, "auto", categories, locale);
  if (auto.isConfident) return auto;
  const sparse = await recognize(readers, "sparse", categories, locale);
  if (sparse.isConfident) return sparse;
  return auto.extraction.isReceipt ? auto : sparse;
}

export async function readReceipt(
  readers: ReceiptReaders,
  categories: CategoryLike[],
  locale: Locale,
): Promise<ReceiptReading> {
  readers.onStep("qr");
  const qr = parseSunatQr(await attempt(readers.decodeQr, null));

  readers.onStep("ocr");
  const local = await readLocally(readers, categories, locale);
  const extraction = withQr(local.extraction, qr);

  if (qr || local.isConfident) return withSuggestedCategory(extraction, qr ? "qr" : "ocr", readers);
  if (readers.isOnline()) return readWithAi(extraction, qr, readers);
  return extraction.isReceipt ? success(extraction, "ocr") : { ok: false, error: "offline" };
}
