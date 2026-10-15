import { createHash } from "node:crypto";

const UUID_VERSION = 0x50;
const UUID_VARIANT = 0x80;

export function movementId(messageId: string, index: number) {
  const bytes = createHash("sha256").update(`whatsapp:${messageId}:${index}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | UUID_VERSION;
  bytes[8] = (bytes[8] & 0x3f) | UUID_VARIANT;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
