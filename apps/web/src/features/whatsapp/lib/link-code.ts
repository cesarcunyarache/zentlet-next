import { createHash } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LINK_CODE_LENGTH = 8;
const GROUP_SIZE = 4;

export function generateLinkCode(randomBytes: (size: number) => Uint8Array) {
  const bytes = randomBytes(LINK_CODE_LENGTH);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function formatLinkCode(code: string) {
  return `${code.slice(0, GROUP_SIZE)}-${code.slice(GROUP_SIZE)}`;
}

export function normalizeLinkCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashLinkCode(code: string) {
  return createHash("sha256").update(normalizeLinkCode(code)).digest("hex");
}

export function linkCommandText(code: string) {
  return `vincular ${formatLinkCode(code)}`;
}

export function chatUrl(businessPhone: string, text: string) {
  return `https://wa.me/${businessPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
