import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../domain/password/password-hasher.js';

const SCRYPT_CONFIG = { N: 16384, r: 16, p: 1, dkLen: 64 };
const SALT_BYTES = 16;

// `util.promisify` cannot resolve `scrypt`'s options-taking overload, so this
// wraps it directly to keep the custom N/r/p/maxmem parameters.
function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      SCRYPT_CONFIG.dkLen,
      { N: SCRYPT_CONFIG.N, r: SCRYPT_CONFIG.r, p: SCRYPT_CONFIG.p, maxmem: 128 * SCRYPT_CONFIG.N * SCRYPT_CONFIG.r * 2 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

@Injectable()
export class NodePasswordHasher extends PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const key = await deriveKey(password, salt);
    return `${salt}:${key.toString('hex')}`;
  }

  async verify(hash: string, password: string): Promise<boolean> {
    const separatorIndex = hash.indexOf(':');
    if (separatorIndex === -1) return false;

    const salt = hash.slice(0, separatorIndex);
    const storedKeyHex = hash.slice(separatorIndex + 1);
    if (!salt || !storedKeyHex) return false;

    const storedKey = Buffer.from(storedKeyHex, 'hex');
    const derivedKey = await deriveKey(password, salt);
    if (storedKey.length !== derivedKey.length) return false;

    return timingSafeEqual(storedKey, derivedKey);
  }
}
