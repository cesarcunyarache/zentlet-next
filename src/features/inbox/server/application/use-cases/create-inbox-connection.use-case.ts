import { randomBytes } from "node:crypto";
import { generateLocalPart, inboxAddress } from "../../../lib/address";
import { fail } from "../../domain/errors/inbox.errors";
import type { InboundMailbox } from "../../domain/ports/inbox.ports";
import type { EmailInboxRepository } from "../../domain/repositories/email-inbox.repository";

const MAX_ADDRESS_ATTEMPTS = 3;

export class CreateInboxConnectionUseCase {
  constructor(
    private readonly emailInboxRepository: EmailInboxRepository,
    private readonly inboundMailbox: InboundMailbox,
  ) {}

  async execute(userId: string) {
    const domain = this.inboundMailbox.domain();
    if (!domain) return fail("email_import_unavailable");

    const existing = await this.emailInboxRepository.findByUser(userId);
    if (existing) return { inbox: existing };

    for (let attempt = 0; attempt < MAX_ADDRESS_ATTEMPTS; attempt++) {
      const address = inboxAddress(generateLocalPart(randomBytes), domain);
      const created = await this.emailInboxRepository.insert(userId, address);
      const addressTaken = created === "conflict";
      if (!addressTaken) return { inbox: created };

      const createdByConcurrentRequest = await this.emailInboxRepository.findByUser(userId);
      if (createdByConcurrentRequest) return { inbox: createdByConcurrentRequest };
    }

    throw new Error("Could not allocate an inbox address");
  }
}
