import { pickSuccessor } from "../../domain/list.policy";
import type { ListNotifier } from "../../domain/list.ports";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";

export class HandOverListsUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
    private readonly notifier: ListNotifier,
  ) {}

  async execute(ownerId: string) {
    for (const listId of await this.lists.findOwnedIds(ownerId)) {
      const successor = pickSuccessor(await this.members.findAll(listId), ownerId);
      if (!successor) {
        await this.lists.delete(listId);
        continue;
      }
      await this.members.transferOwnership(listId, ownerId, successor.userId);
      const list = await this.lists.findById(listId);
      if (list) await this.notifier.ownershipReceived(successor.userId, { listId, listName: list.name });
    }
  }
}
