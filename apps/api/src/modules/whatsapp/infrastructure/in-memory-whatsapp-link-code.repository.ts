import { Injectable } from '@nestjs/common';
import { WhatsappLinkCodeRepository } from '../domain/whatsapp-link-code/whatsapp-link-code.repository.js';

type StoredCode = { userId: string; expiresAt: Date };

@Injectable()
export class InMemoryWhatsappLinkCodeRepository extends WhatsappLinkCodeRepository {
  private readonly byCodeHash = new Map<string, StoredCode>();

  async save(userId: string, codeHash: string, expiresAt: Date): Promise<void> {
    for (const [hash, code] of this.byCodeHash) {
      if (code.userId === userId) this.byCodeHash.delete(hash);
    }
    this.byCodeHash.set(codeHash, { userId, expiresAt });
  }

  async consume(codeHash: string, now: Date): Promise<string | null> {
    const code = this.byCodeHash.get(codeHash);
    this.byCodeHash.delete(codeHash);
    if (!code) return null;
    return code.expiresAt > now ? code.userId : null;
  }
}
