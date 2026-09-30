import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

interface SignatureInput {
  header: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  now: number;
}

function parseHeader(header: string) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.trim().split("=", 2)));
  return {
    ts: parts.ts as string | undefined,
    v1: parts.v1 as string | undefined,
  };
}

export function signatureManifest({
  dataId,
  requestId,
  ts,
}: {
  dataId: string | null;
  requestId: string | null;
  ts: string;
}) {
  const id = dataId ? `id:${dataId.toLowerCase()};` : "";
  const request = requestId ? `request-id:${requestId};` : "";
  return `${id}${request}ts:${ts};`;
}

export function isValidSignature({ header, requestId, dataId, secret, now }: SignatureInput) {
  if (!header || !secret) return false;
  const { ts, v1 } = parseHeader(header);
  if (!ts || !v1 || Math.abs(now - Number(ts)) > SIGNATURE_TOLERANCE_MS) return false;

  const expected = createHmac("sha256", secret).update(signatureManifest({ dataId, requestId, ts })).digest("hex");
  const given = Buffer.from(v1);
  const computed = Buffer.from(expected);
  return given.length === computed.length && timingSafeEqual(given, computed);
}
