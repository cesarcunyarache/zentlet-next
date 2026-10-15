import type { UpdateListInput } from "../../../schemas/list-api.schema";
import { fail } from "../../domain/list.errors";
import { canManage } from "../../domain/list.policy";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";

export class UpdateListUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, input: UpdateListInput) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");
    if ((await this.lists.findById(listId))?.isPrivate) return fail("forbidden");

    return { list: await this.lists.update(listId, input) };
  }
}
