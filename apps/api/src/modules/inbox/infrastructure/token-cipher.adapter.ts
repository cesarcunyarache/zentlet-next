import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { TokenCipher } from '../domain/token-cipher.js';

// AES-256-GCM for secrets stored in the database, such as Gmail OAuth refresh
// tokens. The key is derived from TOKEN_ENCRYPTION_KEY; without it nothing is
// sealed, and callers must treat this adapter as unavailable.
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const VERSION = 'v1';

function encryptionKey(): Buffer | null {
  const secret = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  return secret ? createHash('sha256').update(secret).digest() : null;
}

@Injectable()
export class AesTokenCipher extends TokenCipher {
  isConfigured(): boolean {
    return encryptionKey() !== null;
  }

  seal(plain: string): string {
    const key = this.requireKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const parts = [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url'));
    return [VERSION, ...parts].join('.');
  }

  open(sealed: string): string {
    const [version, iv, tag, encrypted] = sealed.split('.');
    if (version !== VERSION || !iv || !tag || !encrypted) throw new Error('Unsupported secret format');
    const decipher = createDecipheriv(ALGORITHM, this.requireKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
  }

  private requireKey(): Buffer {
    const key = encryptionKey();
    if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
    return key;
  }
}
