// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "@/lib/observability/client";
import type { ReceiptExtraction } from "../../../ai/schemas/receipt-ai.schema";
import { compressImage } from "../../../lib/receipt/image";
import { readReceipt } from "../../../lib/receipt/read-receipt";
import type { CategoryLike } from "../../../types";
import { useReceiptScan } from "../useReceiptScan";

vi.mock("next-intl", () => ({ useLocale: () => "es", useTranslations: () => (key: string) => key }));
vi.mock("@/lib/observability/client", () => ({ track: vi.fn() }));
vi.mock("../../../lib/receipt/image", () => ({ compressImage: vi.fn() }));
vi.mock("../../../lib/receipt/read-receipt", () => ({ readReceipt: vi.fn() }));
vi.mock("../../../ai/actions/receipt-scanner", () => ({ scanReceipt: vi.fn() }));
vi.mock("../../../ai/actions/category-suggester", () => ({ suggestTransactionCategory: vi.fn() }));
vi.mock("../../../services/receipt/ocr", () => ({ recognizeImageText: vi.fn() }));
vi.mock("../../../services/receipt/qr", () => ({ decodeQrFromImage: vi.fn() }));

const categories: CategoryLike[] = [
  { id: "food", name: "Comida", icon: "🍔", color: "#FDE68A" },
  { id: "health", name: "Salud", icon: "💊", color: "#D5F0DD" },
];

const extraction = (overrides: Partial<ReceiptExtraction> = {}): ReceiptExtraction => ({
  isReceipt: true,
  amount: 42.5,
  currency: "PEN",
  date: null,
  summary: "Bodega · S/ 42.50",
  description: "Bodega",
  categoryId: "food",
  type: "expense",
  ...overrides,
});

const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function renderScan() {
  const onSave = vi.fn();
  const onEdit = vi.fn();
  const hook = renderHook(() => useReceiptScan({ categories, currency: "PEN", onSave, onEdit }));
  return { ...hook, onSave, onEdit };
}

beforeEach(() => {
  URL.createObjectURL = vi.fn((blob: Blob) => `blob:${(blob as File).name}`);
  URL.revokeObjectURL = vi.fn();
  vi.mocked(compressImage).mockImplementation(async (image: Blob) => image);
  vi.mocked(readReceipt).mockResolvedValue({ ok: true, extraction: extraction(), method: "qr", isCategoryAi: false });
});

afterEach(() => vi.clearAllMocks());

describe("useReceiptScan", () => {
  it("lee la boleta y la deja lista para guardar", async () => {
    const { result } = renderScan();

    act(() => result.current.pickFile(file("boleta.jpg")));

    expect(result.current.isOpen).toBe(true);
    await waitFor(() => expect(result.current.stage).toBe("preview"));
    expect(result.current.values).toMatchObject({ amount: 42.5, categoryId: "food", type: "expense" });
    expect(result.current.canSave).toBe(true);
    expect(track).toHaveBeenCalledWith("receipt_scan_started", {});
  });

  it("si se elige otra foto antes de terminar, la lectura anterior se descarta", async () => {
    let finishFirst: (value: Awaited<ReturnType<typeof readReceipt>>) => void = () => {};
    vi.mocked(readReceipt)
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce({
        ok: true,
        extraction: extraction({ amount: 10, description: "Farmacia", categoryId: "health" }),
        method: "ocr",
        isCategoryAi: false,
      });
    const { result } = renderScan();

    act(() => result.current.pickFile(file("primera.jpg")));
    await waitFor(() => expect(readReceipt).toHaveBeenCalledTimes(1));
    act(() => result.current.pickFile(file("segunda.jpg")));
    await waitFor(() => expect(result.current.stage).toBe("preview"));

    await act(async () => finishFirst({ ok: true, extraction: extraction(), method: "qr", isCategoryAi: false }));

    expect(result.current.values).toMatchObject({ amount: 10, categoryId: "health" });
    expect(result.current.method).toBe("ocr");
  });

  it("una imagen ilegible muestra el error y se puede reintentar", async () => {
    vi.mocked(compressImage).mockRejectedValueOnce(new Error("corrupt"));
    const { result } = renderScan();

    act(() => result.current.pickFile(file("rota.jpg")));
    await waitFor(() => expect(result.current.error).toBe("invalid_image"));
    expect(track).toHaveBeenCalledWith("receipt_scan_failed", { reason: "invalid_image" });

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.stage).toBe("preview"));
  });

  it("al cerrar, una lectura en curso ya no cambia nada", async () => {
    let finish: (value: Awaited<ReturnType<typeof readReceipt>>) => void = () => {};
    vi.mocked(readReceipt).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { result } = renderScan();

    act(() => result.current.pickFile(file("boleta.jpg")));
    await waitFor(() => expect(readReceipt).toHaveBeenCalled());
    act(() => result.current.close());
    await act(async () => finish({ ok: true, extraction: extraction(), method: "qr", isCategoryAi: false }));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.stage).toBe("scanning");
  });

  it("guardar envía los valores, marca si la categoría fue automática y cierra", async () => {
    const { result, onSave } = renderScan();
    act(() => result.current.pickFile(file("boleta.jpg")));
    await waitFor(() => expect(result.current.canSave).toBe(true));

    act(() => result.current.pickCategory("health"));
    act(() => result.current.save());

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ categoryId: "health", amount: 42.5 }));
    expect(track).toHaveBeenCalledWith("transaction_created", { source: "receipt", type: "expense", category_auto: false });
    expect(result.current.isOpen).toBe(false);
  });

  it("sin categoría reconocida no se puede guardar, pero sí pasar a editar el borrador", async () => {
    vi.mocked(readReceipt).mockResolvedValue({
      ok: true,
      extraction: extraction({ categoryId: "desconocida" }),
      method: "ai",
      isCategoryAi: false,
    });
    const { result, onSave, onEdit } = renderScan();
    act(() => result.current.pickFile(file("boleta.jpg")));
    await waitFor(() => expect(result.current.stage).toBe("preview"));

    act(() => result.current.save());
    expect(onSave).not.toHaveBeenCalled();

    act(() => result.current.edit());
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ amount: 42.5, description: "Bodega" }));
  });
});
