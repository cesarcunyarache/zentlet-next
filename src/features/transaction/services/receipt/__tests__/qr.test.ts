import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeQrFromImage } from "../qr";

vi.mock("jsqr", () => ({ default: vi.fn(() => ({ data: "qr-payload" })) }));

function stubCanvas(context: object | null) {
  const bitmap = { width: 2, height: 2, close: vi.fn() };
  const canvas = { width: 0, height: 0, getContext: () => context };
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
  vi.stubGlobal("document", { createElement: () => canvas });
  return { bitmap, canvas };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("decodeQrFromImage", () => {
  it("lee el QR y libera el bitmap", async () => {
    const context = {
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 }),
      canvas: { width: 2, height: 2 },
    };
    const { bitmap } = stubCanvas(context);

    expect(await decodeQrFromImage(new Blob())).toBe("qr-payload");
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("libera el bitmap aunque no haya contexto 2d", async () => {
    const { bitmap } = stubCanvas(null);

    expect(await decodeQrFromImage(new Blob())).toBeNull();
    expect(bitmap.close).toHaveBeenCalled();
  });
});
