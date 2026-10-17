import { fail } from "../../domain/errors/list.errors";
import { canManage } from "../../domain/policies/list.policy";
import type { InviteRepository } from "../../domain/repositories/invite.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class ListInvitesUseCase {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, now = new Date()) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    const invites = await this.inviteRepository.findActive(listId, now);
    return { invites };
  }
}
