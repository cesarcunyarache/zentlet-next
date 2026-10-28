import { fail } from "../../domain/errors/inbox.errors";
import type { InboxSenderRepository } from "../../domain/repositories/inbox-sender.repository";

export class RemoveInboxSenderUseCase {
  constructor(private readonly inboxSenderRepository: InboxSenderRepository) {}

  async execute(userId: string, id: string) {
    const result = await this.inboxSenderRepository.deleteOwned(userId, id);
    if (result === "not_found") return fail("sender_not_found");
    return { ok: true as const };
  }
}
