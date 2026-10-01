import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const SECONDS_THRESHOLD = 1e12;

export type SignatureCheck = "valid" | "missing" | "stale" | "mismatch";

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

type ManifestInput = Pick<SignatureInput, "dataId" | "requestId"> & { ts: string };

export function signatureManifest({ dataId, requestId, ts }: ManifestInput) {
  const id = dataId ? `id:${dataId.toLowerCase()};` : "";
  const request = requestId ? `request-id:${requestId};` : "";
  return `${id}${request}ts:${ts};`;
}

function toMillis(ts: string) {
  const value = Number(ts);
  return value < SECONDS_THRESHOLD ? value * 1000 : value;
}

export function checkSignature({ header, requestId, dataId, secret, now }: SignatureInput): SignatureCheck {
  if (!header || !secret) return "missing";
  const { ts, v1 } = parseHeader(header);
  if (!ts || !v1) return "missing";
  if (Math.abs(now - toMillis(ts)) > SIGNATURE_TOLERANCE_MS) return "stale";

  const expected = createHmac("sha256", secret).update(signatureManifest({ dataId, requestId, ts })).digest("hex");
  const given = Buffer.from(v1);
  const computed = Buffer.from(expected);
  return given.length === computed.length && timingSafeEqual(given, computed) ? "valid" : "mismatch";
}
