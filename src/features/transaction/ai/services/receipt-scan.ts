import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { limitPromptCategories } from "../prompts/prompt-categories";
import { buildReceiptScanPrompt } from "../prompts/receipt-scan.prompt";
import {
  RECEIPT_IMAGE_MAX_BYTES,
  RECEIPT_IMAGE_TYPES,
  receiptExtractionSchema,
  scanReceiptInputSchema,
  type ReceiptExtraction,
  type ScanReceiptResult,
} from "../schemas/receipt-ai.schema";

const OPERATION = "transaction.scan_receipt";
const TIMEOUT_MS = 30_000;

export interface ReceiptImage {
  data: Uint8Array;
  mediaType: string;
}

export interface ReceiptScanRequest {
  image: ReceiptImage | null;
  categories: unknown;
  today: unknown;
}

export const isValidReceiptImage = (image: ReceiptImage | null): image is ReceiptImage =>
  image !== null &&
  image.data.byteLength > 0 &&
  image.data.byteLength <= RECEIPT_IMAGE_MAX_BYTES &&
  (RECEIPT_IMAGE_TYPES as readonly string[]).includes(image.mediaType);

export async function scanReceiptImage(userId: string, request: ReceiptScanRequest): Promise<ScanReceiptResult> {
  const parsed = scanReceiptInputSchema.safeParse({ categories: request.categories, today: request.today });
  if (!isValidReceiptImage(request.image) || !parsed.success) return { ok: false, error: "invalid_image" };
  if (!(await allowAiCall(userId, OPERATION))) return { ok: false, error: "limited" };

  try {
    const extraction = (await generateObject({
      operation: OPERATION,
      prompt: buildReceiptScanPrompt(limitPromptCategories(parsed.data.categories), parsed.data.today),
      schema: receiptExtractionSchema,
      image: request.image,
      timeoutMs: TIMEOUT_MS,
    })) as ReceiptExtraction;

    if (!extraction.isReceipt && !extraction.amount) return { ok: false, error: "not_receipt" };
    return { ok: true, extraction };
  } catch {
    return { ok: false, error: "failed" };
  }
}
