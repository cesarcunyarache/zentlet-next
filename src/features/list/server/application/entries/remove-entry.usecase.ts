import { fail } from "../../domain/list.errors";
import { canRemoveEntry } from "../../domain/list.policy";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";

export class RemoveEntryUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, transactionId: string) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");

    const authorId = await this.lists.findEntryAuthor(listId, transactionId);
    if (!authorId) return fail("transaction_not_found");
    if (!canRemoveEntry(membership.role, authorId === userId)) return fail("forbidden");

    await this.lists.unassign(listId, transactionId);
    return { ok: true as const };
  }
}
