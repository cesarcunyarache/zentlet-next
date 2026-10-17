import type { InviteRepository } from "../../domain/invite.repository";
import { fail } from "../../domain/list.errors";
import { canManage } from "../../domain/list.policy";
import type { MemberRepository } from "../../domain/member.repository";

export class RevokeInviteUseCase {
  constructor(
    private readonly invites: InviteRepository,
    private readonly members: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, inviteId: string, now = new Date()) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    return (await this.invites.revoke(listId, inviteId, now)) ? { ok: true as const } : fail("invite_invalid");
  }
}
