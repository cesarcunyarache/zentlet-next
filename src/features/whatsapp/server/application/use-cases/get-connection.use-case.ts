import type { TWhatsappConnection } from "../../../types";
import type { WhatsappRepository } from "../../domain/repositories/whatsapp.repository";

export class GetConnectionUseCase {
  constructor(
    private readonly links: WhatsappRepository,
    private readonly businessPhone: string | null,
  ) {}

  async execute(userId: string): Promise<TWhatsappConnection> {
    const link = await this.links.findByUser(userId);
    return {
      isAvailable: this.businessPhone !== null,
      phone: link?.phone ?? null,
      linkedAt: link?.createdAt.toISOString() ?? null,
    };
  }
}
