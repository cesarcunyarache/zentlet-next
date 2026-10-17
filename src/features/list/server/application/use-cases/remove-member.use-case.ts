import { fail } from "../../domain/list.errors";
import { canManage } from "../../domain/list.policy";
import type { MemberRepository } from "../../domain/member.repository";

export class RemoveMemberUseCase {
  constructor(private readonly members: MemberRepository) {}

  async execute(userId: string, listId: string, memberId: string) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");

    if (memberId === userId) {
      if (membership.role === "owner") return fail("owner_cannot_leave");
    } else {
      if (!canManage(membership.role)) return fail("forbidden");
      const target = await this.members.find(listId, memberId);
      if (!target) return fail("member_not_found");
      if (target.role === "owner") return fail("forbidden");
    }

    await this.members.remove(listId, memberId);
    return { ok: true as const };
  }
}
