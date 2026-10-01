import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkSignature, isValidSignature, signatureManifest, SIGNATURE_TOLERANCE_MS } from "./signature";

const SECRET = "test-secret";
const NOW = 1_790_000_000_000;
const sign = (manifest: string) => createHmac("sha256", SECRET).update(manifest).digest("hex");
const header = (ts: number, v1: string) => `ts=${ts},v1=${v1}`;

const base = { requestId: "req-1", dataId: "ABC123", secret: SECRET, now: NOW };
const validHeader = header(
  NOW,
  sign(
    signatureManifest({
      dataId: "ABC123",
      requestId: "req-1",
      ts: String(NOW),
    }),
  ),
);

describe("signatureManifest", () => {
  it("sigue la plantilla de Mercado Pago con el id en minúsculas", () => {
    expect(signatureManifest({ dataId: "ABC123", requestId: "req-1", ts: "1" })).toBe(
      "id:abc123;request-id:req-1;ts:1;",
    );
  });

  it("omite los valores ausentes", () => {
    expect(signatureManifest({ dataId: null, requestId: null, ts: "1" })).toBe("ts:1;");
  });
});

describe("isValidSignature", () => {
  it("acepta una firma correcta", () => {
    expect(isValidSignature({ ...base, header: validHeader })).toBe(true);
  });

  it("rechaza una firma alterada o de otro recurso", () => {
    expect(isValidSignature({ ...base, header: header(NOW, "0".repeat(64)) })).toBe(false);
    expect(isValidSignature({ ...base, dataId: "OTHER", header: validHeader })).toBe(false);
  });

  it("rechaza una notificación fuera de la ventana de tiempo", () => {
    expect(
      isValidSignature({
        ...base,
        now: NOW + SIGNATURE_TOLERANCE_MS + 1,
        header: validHeader,
      }),
    ).toBe(false);
  });

  it("rechaza sin cabecera o sin secreto", () => {
    expect(isValidSignature({ ...base, header: null })).toBe(false);
    expect(isValidSignature({ ...base, secret: "", header: validHeader })).toBe(false);
    expect(isValidSignature({ ...base, header: "garbage" })).toBe(false);
  });
});

describe("checkSignature", () => {
  it("explica por qué rechaza", () => {
    expect(checkSignature({ ...base, header: null })).toBe("missing");
    expect(checkSignature({ ...base, now: NOW + SIGNATURE_TOLERANCE_MS + 1, header: validHeader })).toBe("stale");
    expect(checkSignature({ ...base, dataId: "OTHER", header: validHeader })).toBe("mismatch");
  });

  it("acepta el timestamp en segundos", () => {
    const seconds = Math.floor(NOW / 1000);
    const manifest = signatureManifest({ dataId: "ABC123", requestId: "req-1", ts: String(seconds) });
    expect(checkSignature({ ...base, header: header(seconds, sign(manifest)) })).toBe("valid");
  });
});
