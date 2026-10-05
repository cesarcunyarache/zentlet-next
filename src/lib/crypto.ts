import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

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

export function isEncryptionConfigured() {
  return encryptionKey() !== null;
}

export function encryptSecret(plain: string) {
  const key = encryptionKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted].map((part) => (typeof part === "string" ? part : part.toString("base64url"))).join(".");
}

export function decryptSecret(sealed: string) {
  const key = encryptionKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const [version, iv, tag, encrypted] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
