"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
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

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function isValidImage(value: FormDataEntryValue | null): value is File {
  return (
    value instanceof File &&
    value.size > 0 &&
    value.size <= RECEIPT_IMAGE_MAX_BYTES &&
    (RECEIPT_IMAGE_TYPES as readonly string[]).includes(value.type)
  );
}

function parseInput(formData: FormData) {
  try {
    return scanReceiptInputSchema.safeParse({
      categories: JSON.parse(String(formData.get("categories") ?? "[]")),
      today: formData.get("today"),
    });
  } catch {
    return null;
  }
}

export async function scanReceipt(formData: FormData): Promise<ScanReceiptResult> {
  const image = formData.get("image");
  const parsed = parseInput(formData);
  if (!isValidImage(image) || !parsed?.success) return { ok: false, error: "invalid_image" };

  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "failed" };
  if (!(await allowAiCall(userId, OPERATION))) return { ok: false, error: "limited" };

  try {
    const extraction = (await generateObject({
      operation: OPERATION,
      prompt: buildReceiptScanPrompt(limitPromptCategories(parsed.data.categories), parsed.data.today),
      schema: receiptExtractionSchema,
      image: { data: new Uint8Array(await image.arrayBuffer()), mediaType: image.type },
      timeoutMs: TIMEOUT_MS,
    })) as ReceiptExtraction;

    if (!extraction.isReceipt && !extraction.amount) return { ok: false, error: "not_receipt" };
    return { ok: true, extraction };
  } catch {
    return { ok: false, error: "failed" };
  }
}
