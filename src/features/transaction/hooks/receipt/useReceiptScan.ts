import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { today, toISODate } from "@/lib/dates";
import { track } from "@/lib/observability/client";
import { suggestTransactionCategory } from "../../ai/actions/category-suggester";
import { scanReceipt } from "../../ai/actions/receipt-scanner";
import type { ReceiptExtraction } from "../../ai/schemas/receipt-ai.schema";
import { compressImage } from "../../lib/receipt/image";
import { readReceipt, type ReceiptMethod, type ReceiptReaders, type ReceiptStep } from "../../lib/receipt/read-receipt";
import {
  isForeignCurrency,
  toReceiptDraft,
  type ReceiptError,
  type ReceiptStage,
} from "../../lib/receipt/receipt-draft";
import { canSaveVoiceEntry, toEditDraft, toFormValues } from "../../lib/voice-entry";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import { recognizeImageText } from "../../services/receipt/ocr";
import { decodeQrFromImage } from "../../services/receipt/qr";
import type { CategoryLike } from "../../types";

interface UseReceiptScanOptions {
  categories: CategoryLike[];
  currency: string;
  onSave: (values: TransactionFormValues) => void;
  onEdit: (draft: Partial<TransactionFormValues>) => void;
}

interface ScanState {
  stage: ReceiptStage;
  step: ReceiptStep;
  extraction: ReceiptExtraction | null;
  method: ReceiptMethod | null;
  isCategoryAi: boolean;
  error: ReceiptError | null;
}

const SCANNING: ScanState = {
  stage: "scanning",
  step: "qr",
  extraction: null,
  method: null,
  isCategoryAi: false,
  error: null,
};

function failed(error: ReceiptError): ScanState {
  return { ...SCANNING, stage: "error", error };
}

async function readImage(file: File) {
  try {
    return await compressImage(file);
  } catch {
    return null;
  }
}

function promptCategories(categories: CategoryLike[]) {
  return categories.map(({ id, name }) => ({ id, name }));
}

function scanWithAi(image: Blob, categories: CategoryLike[]) {
  const formData = new FormData();
  formData.set("image", image, "receipt.jpg");
  formData.set("categories", JSON.stringify(promptCategories(categories)));
  formData.set("today", toISODate(today()));
  return scanReceipt(formData);
}

export function useReceiptScan({ categories, currency, onSave, onEdit }: UseReceiptScanOptions) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
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

  function readersFor(image: Blob, isCurrent: () => boolean): ReceiptReaders {
    return {
      decodeQr: () => decodeQrFromImage(image),
      recognizeText: (mode) => recognizeImageText(image, locale, mode),
      scanWithAi: () => scanWithAi(image, categories),
      suggestCategory: async (description) =>
        (await suggestTransactionCategory({ description, categories: promptCategories(categories) }))?.categoryId ??
        null,
      isOnline: () => navigator.onLine,
      onStep: (step) => isCurrent() && setScan((current) => ({ ...current, step })),
    };
  }

  async function run(file: File) {
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;
    setScan(SCANNING);
    setManualCategoryId(null);

    const image = await readImage(file);
    if (!isCurrent()) return;
    if (!image) {
      setScan(failed("invalid_image"));
      track("receipt_scan_failed", { reason: "invalid_image" });
      return;
    }

    const reading = await readReceipt(readersFor(image, isCurrent), categories, locale);
    if (!isCurrent()) return;
    if (!reading.ok) {
      setScan(failed(reading.error));
      track("receipt_scan_failed", { reason: reading.error });
      return;
    }
    const { extraction, method, isCategoryAi } = reading;
    setScan({ ...SCANNING, stage: "preview", extraction, method, isCategoryAi });
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

  function completedProps() {
    return { method: scan.method ?? "ocr" };
  }

  function save() {
    if (!values || !canSave) return;
    onSave(values);
    track("receipt_scan_completed", { outcome: "saved", ...completedProps() });
    track("transaction_created", { source: "receipt", type: values.type, category_auto: !manualCategoryId });
    close();
  }

  function edit() {
    if (!draft) return;
    track("receipt_scan_completed", { outcome: "edited", ...completedProps() });
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
    step: scan.step,
    method: scan.method,
    error: scan.error,
    previewUrl,
    summary: scan.extraction?.summary ?? "",
    isForeignCurrency: scan.extraction ? isForeignCurrency(scan.extraction, currency) : false,
    detectedCurrency: scan.extraction?.currency ?? null,
    draft,
    values,
    canSave,
    isAiSuggested: scan.isCategoryAi && !manualCategoryId && Boolean(draft?.categoryId),
    pickFile,
    close,
    retry,
    save,
    edit,
    typeInstead,
    pickCategory: setManualCategoryId,
  };
}
