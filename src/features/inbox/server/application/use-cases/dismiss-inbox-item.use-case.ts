import { shouldAutoBlock } from "../../../lib/sender";
import { fail } from "../../domain/errors/inbox.errors";
import type { InboxItemRepository } from "../../domain/repositories/inbox-item.repository";
import type { InboxSenderRepository } from "../../domain/repositories/inbox-sender.repository";

export class DismissInboxItemUseCase {
  constructor(
    private readonly inboxItemRepository: InboxItemRepository,
    private readonly inboxSenderRepository: InboxSenderRepository,
  ) {}

  async execute(userId: string, id: string) {
    const item = await this.inboxItemRepository.findPendingOwned(userId, id);
    if (!item) return fail("not_found");

    await this.inboxItemRepository.markDismissed(item.id);
    const sender = await this.inboxSenderRepository.recordDismissal(userId, item.senderAddress);

    const isStillTrusted = sender.status === "trusted";
    if (isStillTrusted && shouldAutoBlock(item.senderAddress, sender)) {
      await this.inboxSenderRepository.block(sender.id);
    }

    return { ok: true as const };
  }
}
