import type { InboxItemRepository } from "../../domain/repositories/inbox-item.repository";

export class ListPendingInboxItemsUseCase {
  constructor(private readonly inboxItemRepository: InboxItemRepository) {}

  execute(userId: string) {
    return this.inboxItemRepository.findPending(userId);
  }
}
