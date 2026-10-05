"use server";

import { getActionUserId } from "@/lib/api/action-session";
import { RECEIPT_IMAGE_MAX_BYTES, type ScanReceiptResult } from "../schemas/receipt-ai.schema";
import { scanReceiptImage, type ReceiptImage } from "../services/receipt-scan";

async function readImage(value: FormDataEntryValue | null): Promise<ReceiptImage | null> {
  if (!(value instanceof File) || value.size > RECEIPT_IMAGE_MAX_BYTES) return null;
  return { data: new Uint8Array(await value.arrayBuffer()), mediaType: value.type };
}

function readCategories(formData: FormData) {
  try {
    return JSON.parse(String(formData.get("categories") ?? "[]"));
  } catch {
    return null;
  }
}

export async function scanReceipt(formData: FormData): Promise<ScanReceiptResult> {
  const image = await readImage(formData.get("image"));
  const categories = readCategories(formData);
  if (!image || categories === null) return { ok: false, error: "invalid_image" };

  const userId = await getActionUserId();
  if (!userId) return { ok: false, error: "failed" };
  return scanReceiptImage(userId, { image, categories, today: formData.get("today") });
}
