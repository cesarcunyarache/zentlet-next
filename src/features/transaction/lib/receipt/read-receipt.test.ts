import { describe, expect, it, vi } from "vitest";
import type { ReceiptExtraction, ScanReceiptResult } from "../../ai/schemas/receipt-ai.schema";
import { readReceipt, type ReceiptReaders } from "./read-receipt";

const categories = [{ id: "transport", name: "Transporte" }];
const QR = "20508565934|03|B105|00482211|11.43|74.90|2026-09-27|1|45678912|";
const AI_EXTRACTION: ReceiptExtraction = {
  isReceipt: true,
  amount: 18,
  currency: "PEN",
  date: "2026-09-29",
  summary: "Voucher Cabify",
  description: "Cabify",
  categoryId: "transport",
  type: "expense",
};

function readers(overrides: Partial<ReceiptReaders> = {}): ReceiptReaders {
  return {
    decodeQr: vi.fn(async () => null),
    recognizeText: vi.fn(async () => ""),
    scanWithAi: vi.fn(async (): Promise<ScanReceiptResult> => ({ ok: true, extraction: AI_EXTRACTION })),
    suggestCategory: vi.fn(async () => null),
    isOnline: () => true,
    onStep: vi.fn(),
    ...overrides,
  };
}

describe("readReceipt", () => {
  it("uses the SUNAT QR without calling the AI", async () => {
    const deps = readers({ decodeQr: async () => QR, recognizeText: async () => "TIENDAS TAMBO\nBOLETA" });
    const result = await readReceipt(deps, categories, "es");
    expect(result).toMatchObject({ ok: true, method: "qr", extraction: { amount: 74.9, date: "2026-09-27" } });
    expect(deps.scanWithAi).not.toHaveBeenCalled();
  });

  it("uses local OCR for a clear Yape screenshot without the image AI", async () => {
    const deps = readers({ recognizeText: async () => "¡Yapeaste!\nS/ 25\nTaxi Seguro" });
    const result = await readReceipt(deps, categories, "es");
    expect(result).toMatchObject({ ok: true, method: "ocr", extraction: { amount: 25 } });
    expect(deps.scanWithAi).not.toHaveBeenCalled();
  });

  it("retries OCR in sparse mode before calling the image AI", async () => {
    const deps = readers({
      recognizeText: vi.fn(async (mode) => (mode === "auto" ? "¡Yapeaste!\nJuan" : "¡Yapeaste!\nS/ 25\nJuan")),
    });
    const result = await readReceipt(deps, categories, "es");
    expect(deps.recognizeText).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, method: "ocr", extraction: { amount: 25 } });
    expect(deps.scanWithAi).not.toHaveBeenCalled();
  });

  it("asks the cheap text AI only for a missing category", async () => {
    const deps = readers({
      recognizeText: async () => "¡Yapeaste!\nS/ 25\nJuan Perez",
      suggestCategory: vi.fn(async () => "transport"),
    });
    const result = await readReceipt(deps, categories, "es");
    expect(deps.suggestCategory).toHaveBeenCalledWith("Yape a Juan Perez");
    expect(result).toMatchObject({ ok: true, isCategoryAi: true, extraction: { categoryId: "transport" } });
  });

  it("falls back to the image AI when OCR is not confident", async () => {
    const deps = readers({ recognizeText: async () => "C4B1FY\n~~ 18" });
    const result = await readReceipt(deps, categories, "es");
    expect(deps.onStep).toHaveBeenLastCalledWith("ai");
    expect(result).toMatchObject({ ok: true, method: "ai", isCategoryAi: true, extraction: { amount: 18 } });
  });

  it("keeps the exact QR amount over the AI amount", async () => {
    const deps = readers({ decodeQr: async () => "20508565934|03|B1|1|0|50.00|bad" });
    const result = await readReceipt(deps, categories, "es");
    expect(result).toMatchObject({ ok: true, method: "qr", extraction: { amount: 50 } });
  });

  it("shows the partial local reading when the AI quota is exhausted", async () => {
    const deps = readers({
      recognizeText: async () => "MINIMARKET ROSITA\nGASEOSA S/ 3.50",
      scanWithAi: async () => ({ ok: false, error: "limited" }),
    });
    const result = await readReceipt(deps, categories, "es");
    expect(result).toMatchObject({ ok: true, method: "ocr", extraction: { amount: 3.5 } });
  });

  it("reports the AI error when nothing was read locally", async () => {
    const deps = readers({ scanWithAi: async () => ({ ok: false, error: "limited" }) });
    expect(await readReceipt(deps, categories, "es")).toEqual({ ok: false, error: "limited" });
  });

  it("trusts the AI rejection unless OCR found an amount", async () => {
    const deps = readers({
      recognizeText: async () => "BOLETA",
      scanWithAi: async () => ({ ok: false, error: "not_receipt" }),
    });
    expect(await readReceipt(deps, categories, "es")).toEqual({ ok: false, error: "not_receipt" });
  });

  it("survives failing readers", async () => {
    const deps = readers({
      decodeQr: async () => Promise.reject(new Error("no canvas")),
      recognizeText: async () => Promise.reject(new Error("no wasm")),
      scanWithAi: async () => Promise.reject(new Error("network")),
    });
    expect(await readReceipt(deps, categories, "es")).toEqual({ ok: false, error: "failed" });
  });

  it("works offline with the local reading and never calls the AI", async () => {
    const deps = readers({ isOnline: () => false, recognizeText: async () => "¡Yapeaste!\nS/ 25\nJuan" });
    const result = await readReceipt(deps, categories, "es");
    expect(result).toMatchObject({ ok: true, method: "ocr" });
    expect(deps.scanWithAi).not.toHaveBeenCalled();
    expect(deps.suggestCategory).not.toHaveBeenCalled();
  });

  it("reports offline when nothing could be read locally", async () => {
    const deps = readers({ isOnline: () => false, recognizeText: async () => "hola" });
    expect(await readReceipt(deps, categories, "es")).toEqual({ ok: false, error: "offline" });
  });
});
