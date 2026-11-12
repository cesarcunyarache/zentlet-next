import { Injectable } from '@nestjs/common';
import { WhatsappLinkRepository } from '../../../domain/whatsapp-link/whatsapp-link.repository.js';
import type { UnlinkWhatsappInput } from './unlink-whatsapp.input.js';

export type UnlinkWhatsappOutput = { status: 'unlinked' } | { status: 'not_linked' };

@Injectable()
export class UnlinkWhatsappUseCase {
  constructor(private readonly links: WhatsappLinkRepository) {}

  async execute({ userId }: UnlinkWhatsappInput): Promise<UnlinkWhatsappOutput> {
    return (await this.links.unlink(userId)) ? { status: 'unlinked' } : { status: 'not_linked' };
  }
}
