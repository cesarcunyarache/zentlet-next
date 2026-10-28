import { fail } from "../../domain/errors/list.errors";
import { isInviteUsable } from "../../domain/policies/invite.policy";
import type { InviteTokens } from "../../domain/ports/invite.ports";
import type { InviteRepository } from "../../domain/repositories/invite.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class PreviewInviteUseCase {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly memberRepository: MemberRepository,
    private readonly inviteTokens: InviteTokens,
  ) {}

  async execute(userId: string, token: string, now = new Date()) {
    const invite = await this.inviteRepository.findByTokenHash(this.inviteTokens.hash(token));
    if (!invite) return fail("invite_invalid");

    const membership = await this.memberRepository.find(invite.listId, userId);
    const isMember = membership !== null;
    if (!isMember && !isInviteUsable(invite, now)) return fail("invite_invalid");

    return { invite, isMember };
  }
}
