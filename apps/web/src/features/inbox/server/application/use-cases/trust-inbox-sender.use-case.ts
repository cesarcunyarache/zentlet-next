import { normalizeSenderPattern } from "../../../lib/sender";
import { fail } from "../../domain/errors/inbox.errors";
import type { InboxSenderRepository } from "../../domain/repositories/inbox-sender.repository";

export class TrustInboxSenderUseCase {
  constructor(private readonly inboxSenderRepository: InboxSenderRepository) {}

  async execute(userId: string, address: string) {
    const pattern = normalizeSenderPattern(address);
    if (!pattern) return fail("invalid_sender");

    const sender = await this.inboxSenderRepository.trust(userId, pattern);
    return { sender };
  }
}
