import { fail } from "../../domain/errors/list.errors";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class GetListUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(userId: string, listId: string) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");

    const list = await this.listRepository.findById(listId);
    if (!list) return fail("not_found");

    const breakdown = await this.listRepository.findBreakdown(listId);
    return { list, role: membership.role, breakdown };
  }
}
