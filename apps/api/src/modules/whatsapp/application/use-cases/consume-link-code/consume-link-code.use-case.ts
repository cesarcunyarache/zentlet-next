import { Injectable } from '@nestjs/common';
import { hashLinkCode } from '../../../domain/whatsapp-link-code/whatsapp-link-code.js';
import { WhatsappLinkCodeRepository } from '../../../domain/whatsapp-link-code/whatsapp-link-code.repository.js';
import { WhatsappLinkRepository } from '../../../domain/whatsapp-link/whatsapp-link.repository.js';
import type { ConsumeLinkCodeInput } from './consume-link-code.input.js';

export type ConsumeLinkCodeOutput = { status: 'linked'; userId: string } | { status: 'invalid_or_expired' };

@Injectable()
export class ConsumeLinkCodeUseCase {
  constructor(
    private readonly linkCodes: WhatsappLinkCodeRepository,
    private readonly links: WhatsappLinkRepository,
  ) {}

  async execute({ code, phone }: ConsumeLinkCodeInput, now = new Date()): Promise<ConsumeLinkCodeOutput> {
    const userId = await this.linkCodes.consume(hashLinkCode(code), now);
    if (!userId) return { status: 'invalid_or_expired' };

    await this.links.link(userId, phone);
    return { status: 'linked', userId };
  }
}
