import type { InviteRepository } from "../../domain/invite.repository";
import { fail } from "../../domain/list.errors";
import { canManage } from "../../domain/list.policy";
import type { MemberRepository } from "../../domain/member.repository";

export class ListInvitesUseCase {
  constructor(
    private readonly invites: InviteRepository,
    private readonly members: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, now = new Date()) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    return { invites: await this.invites.findActive(listId, now) };
  }
}
