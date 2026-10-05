import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Cifrado simétrico (AES-256-GCM) para secretos guardados en la base de
 * datos, como los refresh tokens de OAuth. La clave sale de
 * TOKEN_ENCRYPTION_KEY; sin ella no se cifra nada y quien lo use debe
 * tratar su función como no disponible.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";

function encryptionKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  return secret ? createHash("sha256").update(secret).digest() : null;
}

function requireEncryptionKey() {
  const key = encryptionKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  return key;
}

export function isEncryptionConfigured() {
  return encryptionKey() !== null;
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, requireEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const parts = [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url"));
  return [VERSION, ...parts].join(".");
}

export function decryptSecret(sealed: string) {
  const [version, iv, tag, encrypted] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv(ALGORITHM, requireEncryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

/** Compara dos secretos en tiempo constante; un valor ausente nunca coincide. */
export function safeEqual(expected: string | null | undefined, given: string | null | undefined) {
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
