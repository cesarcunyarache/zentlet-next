import { fail } from "../../domain/errors/whatsapp.errors";
import type { WhatsappRepository } from "../../domain/repositories/whatsapp.repository";

export class UnlinkWhatsappUseCase {
  constructor(private readonly links: WhatsappRepository) {}

  async execute(userId: string) {
    return (await this.links.unlinkUser(userId)) ? { ok: true as const } : fail("not_linked");
  }
}
