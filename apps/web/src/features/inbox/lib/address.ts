const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const LOCAL_PART_LENGTH = 12;

export function generateLocalPart(random: (size: number) => Uint8Array) {
  return Array.from(random(LOCAL_PART_LENGTH), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function inboxAddress(localPart: string, domain: string) {
  return `${localPart}@${domain}`.toLowerCase();
}
