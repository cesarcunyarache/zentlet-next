import type { UpdateMemberInput } from "../../../schemas/list-api.schema";
import { fail } from "../../domain/list.errors";
import { canManage } from "../../domain/list.policy";
import type { MemberRepository } from "../../domain/member.repository";

export class UpdateMemberUseCase {
  constructor(private readonly members: MemberRepository) {}

  async execute(userId: string, listId: string, memberId: string, { role }: UpdateMemberInput) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    const target = await this.members.find(listId, memberId);
    if (!target) return fail("member_not_found");
    if (target.role === "owner") return fail("forbidden");

    await this.members.updateRole(listId, memberId, role);
    return { ok: true as const };
  }
}
