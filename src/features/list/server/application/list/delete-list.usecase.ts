import { fail } from "../../domain/list.errors";
import { canManage } from "../../domain/list.policy";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";

export class DeleteListUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
  ) {}

  async execute(userId: string, listId: string) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    await this.lists.delete(listId);
    return { ok: true as const };
  }
}
