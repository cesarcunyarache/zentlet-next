import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 24;

/**
 * Generates a random invite token and its SHA-256 hash. Only the hash is ever
 * persisted — the plaintext token is returned once, to the inviter, and never
 * stored.
 */
@Injectable()
export class InviteTokenService {
  create(): { token: string; hash: string } {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
