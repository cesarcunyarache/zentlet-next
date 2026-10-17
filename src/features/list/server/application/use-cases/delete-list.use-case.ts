import { fail } from "../../domain/errors/list.errors";
import { canManage } from "../../domain/policies/list.policy";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class DeleteListUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(userId: string, listId: string) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    const list = await this.listRepository.findById(listId);
    if (list?.isPrivate) return fail("forbidden");

    await this.listRepository.delete(listId);
    return { ok: true as const };
  }
}
