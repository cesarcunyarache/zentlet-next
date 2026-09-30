import { z } from "zod";
import { suggestCategoryInputSchema } from "./transaction-ai.schema";

export const RECEIPT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const RECEIPT_IMAGE_MAX_BYTES = 900_000;

export const scanReceiptInputSchema = z.object({
  categories: suggestCategoryInputSchema.shape.categories,
  today: z.iso.date(),
});

export type ScanReceiptInput = z.infer<typeof scanReceiptInputSchema>;

export const receiptExtractionSchema = z.object({
  isReceipt: z.boolean(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  date: z.string().nullable(),
  summary: z.string(),
  description: z.string(),
  categoryId: z.string().nullable(),
  type: z.enum(["expense", "income"]),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

export type ScanReceiptError = "not_receipt" | "invalid_image" | "limited" | "failed";

export type ScanReceiptResult =
  | { ok: true; extraction: ReceiptExtraction }
  | { ok: false; error: ScanReceiptError };
