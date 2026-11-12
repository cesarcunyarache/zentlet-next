import { Injectable } from '@nestjs/common';
import {
  formatLinkCode,
  generateLinkCode,
  hashLinkCode,
  LINK_CODE_TTL_MS,
} from '../../../domain/whatsapp-link-code/whatsapp-link-code.js';
import { WhatsappLinkCodeRepository } from '../../../domain/whatsapp-link-code/whatsapp-link-code.repository.js';
import type { GenerateLinkCodeInput } from './generate-link-code.input.js';

export type GenerateLinkCodeOutput = {
  code: string;
  expiresAt: Date;
};

@Injectable()
export class GenerateLinkCodeUseCase {
  constructor(private readonly linkCodes: WhatsappLinkCodeRepository) {}

  async execute({ userId }: GenerateLinkCodeInput, now = new Date()): Promise<GenerateLinkCodeOutput> {
    const code = generateLinkCode();
    const expiresAt = new Date(now.getTime() + LINK_CODE_TTL_MS);

    await this.linkCodes.save(userId, hashLinkCode(code), expiresAt);

    return { code: formatLinkCode(code), expiresAt };
  }
}
