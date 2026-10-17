import { fail } from "../../domain/errors/list.errors";
import { canManage } from "../../domain/policies/list.policy";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class RemoveMemberUseCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(userId: string, listId: string, memberId: string) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");

    const isLeavingList = memberId === userId;

    if (isLeavingList) {
      if (membership.role === "owner") return fail("owner_cannot_leave");
    } else {
      if (!canManage(membership.role)) return fail("forbidden");

      const target = await this.memberRepository.find(listId, memberId);
      if (!target) return fail("member_not_found");
      if (target.role === "owner") return fail("forbidden");
    }

    await this.memberRepository.remove(listId, memberId);
    return { ok: true as const };
  }
}
