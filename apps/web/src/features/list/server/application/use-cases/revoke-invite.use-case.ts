import { fail } from "../../domain/errors/list.errors";
import { canManage } from "../../domain/policies/list.policy";
import type { InviteRepository } from "../../domain/repositories/invite.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class RevokeInviteUseCase {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, inviteId: string, now = new Date()) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    const revoked = await this.inviteRepository.revoke(listId, inviteId, now);
    if (revoked === "not_revocable") return fail("invite_invalid");

    return { ok: true as const };
  }
}
