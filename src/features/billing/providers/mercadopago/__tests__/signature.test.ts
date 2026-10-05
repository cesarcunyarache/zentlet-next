import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkSignature, signatureManifest, SIGNATURE_TOLERANCE_MS } from "../signature";

const SECRET = "test-secret";
const NOW = 1_790_000_000_000;
const sign = (manifest: string) => createHmac("sha256", SECRET).update(manifest).digest("hex");
const header = (ts: number, v1: string) => `ts=${ts},v1=${v1}`;

const base = { requestId: "req-1", dataId: "ABC123", secret: SECRET, now: NOW };
const validHeader = header(NOW, sign(signatureManifest({ dataId: "ABC123", requestId: "req-1", ts: String(NOW) })));

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

describe("checkSignature", () => {
  it("acepta una firma correcta", () => {
    expect(checkSignature({ ...base, header: validHeader })).toBe("valid");
  });

  it("rechaza una firma alterada o de otro recurso", () => {
    expect(checkSignature({ ...base, header: header(NOW, "0".repeat(64)) })).toBe("mismatch");
    expect(checkSignature({ ...base, dataId: "OTHER", header: validHeader })).toBe("mismatch");
  });

  it("rechaza una notificación fuera de la ventana de tiempo", () => {
    expect(checkSignature({ ...base, now: NOW + SIGNATURE_TOLERANCE_MS + 1, header: validHeader })).toBe("stale");
  });

  it("rechaza sin cabecera, sin secreto o con cabecera inválida", () => {
    expect(checkSignature({ ...base, header: null })).toBe("missing");
    expect(checkSignature({ ...base, secret: "", header: validHeader })).toBe("missing");
    expect(checkSignature({ ...base, header: "garbage" })).toBe("missing");
  });

  it("acepta el timestamp en segundos", () => {
    const seconds = Math.floor(NOW / 1000);
    const manifest = signatureManifest({ dataId: "ABC123", requestId: "req-1", ts: String(seconds) });
    expect(checkSignature({ ...base, header: header(seconds, sign(manifest)) })).toBe("valid");
  });
});
