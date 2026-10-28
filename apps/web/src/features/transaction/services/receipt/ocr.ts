import type { Worker } from "tesseract.js";
import type { Locale } from "@/i18n/routing";
import type { OcrMode } from "../../lib/receipt/read-receipt";

const OCR_LANGUAGES: Record<Locale, string> = { es: "spa", en: "eng" };

const workers = new Map<Locale, Promise<Worker>>();

function workerFor(locale: Locale) {
  const cached = workers.get(locale);
  if (cached) return cached;
  const created = import("tesseract.js").then(({ createWorker }) => createWorker(OCR_LANGUAGES[locale]));
  created.catch(() => workers.delete(locale));
  workers.set(locale, created);
  return created;
}

export async function recognizeImageText(image: Blob, locale: Locale, mode: OcrMode) {
  const [{ PSM }, worker] = await Promise.all([import("tesseract.js"), workerFor(locale)]);
  await worker.setParameters({ tessedit_pageseg_mode: mode === "sparse" ? PSM.SPARSE_TEXT : PSM.AUTO });
  const { data } = await worker.recognize(image);
  return data.text;
}
