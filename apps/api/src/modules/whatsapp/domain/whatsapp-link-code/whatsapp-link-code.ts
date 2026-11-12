import { createHash, randomBytes } from 'node:crypto';

export const LINK_CODE_TTL_MS = 10 * 60_000;

const LINK_CODE_LENGTH = 8;
const GROUP_SIZE = 4;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateLinkCode(): string {
  const bytes = randomBytes(LINK_CODE_LENGTH);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

export function formatLinkCode(code: string): string {
  return `${code.slice(0, GROUP_SIZE)}-${code.slice(GROUP_SIZE)}`;
}

export function normalizeLinkCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashLinkCode(code: string): string {
  return createHash('sha256').update(normalizeLinkCode(code)).digest('hex');
}
