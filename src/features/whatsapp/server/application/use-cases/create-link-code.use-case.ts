import type { TWhatsappLinkCode } from "../../../types";
import { chatUrl, formatLinkCode, generateLinkCode, hashLinkCode, linkCommandText } from "../../../lib/link-code";
import { LINK_CODE_TTL_MS } from "../../domain/entities/whatsapp-link.entity";
import { fail } from "../../domain/errors/whatsapp.errors";
import type { WhatsappRepository } from "../../domain/repositories/whatsapp.repository";

export class CreateLinkCodeUseCase {
  constructor(
    private readonly links: WhatsappRepository,
    private readonly businessPhone: string | null,
    private readonly randomBytes: (size: number) => Uint8Array,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(userId: string): Promise<{ linkCode: TWhatsappLinkCode } | { error: "not_available" }> {
    if (!this.businessPhone) return fail("not_available");

    const code = generateLinkCode(this.randomBytes);
    const expiresAt = new Date(this.now().getTime() + LINK_CODE_TTL_MS);
    await this.links.saveLinkCode(userId, hashLinkCode(code), expiresAt);

    return {
      linkCode: {
        code: formatLinkCode(code),
        url: chatUrl(this.businessPhone, linkCommandText(code)),
        expiresAt: expiresAt.toISOString(),
      },
    };
  }
}
