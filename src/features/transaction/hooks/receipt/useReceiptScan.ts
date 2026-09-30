import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { today, toISODate } from "@/lib/dates";
import { track } from "@/lib/observability/client";
import { scanReceipt } from "../../ai/actions/receipt-scanner";
import type { ReceiptExtraction } from "../../ai/schemas/receipt-ai.schema";
import { compressImage } from "../../lib/receipt/image";
import {
  isForeignCurrency,
  toReceiptDraft,
  type ReceiptError,
  type ReceiptStage,
} from "../../lib/receipt/receipt-draft";
import { canSaveVoiceEntry, toEditDraft, toFormValues } from "../../lib/voice-entry";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";

interface UseReceiptScanOptions {
  categories: CategoryLike[];
  currency: string;
  onSave: (values: TransactionFormValues) => void;
  onEdit: (draft: Partial<TransactionFormValues>) => void;
}

interface ScanState {
  stage: ReceiptStage;
  extraction: ReceiptExtraction | null;
  error: ReceiptError | null;
}

const SCANNING: ScanState = { stage: "scanning", extraction: null, error: null };

function failed(error: ReceiptError): ScanState {
  return { stage: "error", extraction: null, error };
}

async function readImage(file: File) {
  try {
    return await compressImage(file);
  } catch {
    return null;
  }
}

function requestScan(image: Blob, categories: CategoryLike[]) {
  const formData = new FormData();
  formData.set("image", image, "receipt.jpg");
  formData.set("categories", JSON.stringify(categories.map(({ id, name }) => ({ id, name }))));
  formData.set("today", toISODate(today()));
  return scanReceipt(formData);
}

export function useReceiptScan({ categories, currency, onSave, onEdit }: UseReceiptScanOptions) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanState>(SCANNING);
  const [manualCategoryId, setManualCategoryId] = useState<string | null>(null);
  const lastFile = useRef<File | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const parsed = scan.extraction && toReceiptDraft(scan.extraction, categories, toISODate(today()));
  const draft = parsed && { ...parsed, categoryId: manualCategoryId ?? parsed.categoryId };
  const values = draft && toFormValues(draft, categories, t("transactions.defaultDescription"));
  const canSave = canSaveVoiceEntry(values);

  async function run(file: File) {
    const id = ++requestId.current;
    setScan(SCANNING);
    setManualCategoryId(null);
    if (!navigator.onLine) {
      setScan(failed("offline"));
      return;
    }
    const image = await readImage(file);
    if (id !== requestId.current) return;
    if (!image) {
      setScan(failed("invalid_image"));
      track("receipt_scan_failed", { reason: "invalid_image" });
      return;
    }
    try {
      const result = await requestScan(image, categories);
      if (id !== requestId.current) return;
      setScan(result.ok ? { stage: "preview", extraction: result.extraction, error: null } : failed(result.error));
      if (!result.ok) track("receipt_scan_failed", { reason: result.error });
    } catch {
      if (id !== requestId.current) return;
      setScan(failed("failed"));
      track("receipt_scan_failed", { reason: "failed" });
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    lastFile.current = file;
    setPreviewUrl(URL.createObjectURL(file));
    setIsOpen(true);
    track("receipt_scan_started", {});
    void run(file);
  }

  function close() {
    requestId.current++;
    lastFile.current = null;
    setPreviewUrl(null);
    setIsOpen(false);
  }

  function retry() {
    if (lastFile.current) void run(lastFile.current);
  }

  function save() {
    if (!values || !canSave) return;
    onSave(values);
    track("receipt_scan_completed", { outcome: "saved" });
    track("transaction_created", { source: "receipt", type: values.type, category_auto: !manualCategoryId });
    close();
  }

  function edit() {
    if (!draft) return;
    track("receipt_scan_completed", { outcome: "edited" });
    close();
    onEdit(toEditDraft(draft));
  }

  function typeInstead() {
    close();
    onEdit({});
  }

  return {
    isOpen,
    stage: scan.stage,
    error: scan.error,
    previewUrl,
    summary: scan.extraction?.summary ?? "",
    isForeignCurrency: scan.extraction ? isForeignCurrency(scan.extraction, currency) : false,
    detectedCurrency: scan.extraction?.currency ?? null,
    draft,
    values,
    canSave,
    isAiSuggested: Boolean(draft?.categoryId && !manualCategoryId),
    pickFile,
    close,
    retry,
    save,
    edit,
    typeInstead,
    pickCategory: setManualCategoryId,
  };
}
