import { fail } from "../../domain/list.errors";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";

export class GetListUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
  ) {}

  async execute(userId: string, listId: string) {
    const membership = await this.members.find(listId, userId);
    const list = membership && (await this.lists.findById(listId));
    if (!membership || !list) return fail("not_found");

    const breakdown = await this.lists.findBreakdown(listId);
    return { list, role: membership.role, breakdown };
  }
}
