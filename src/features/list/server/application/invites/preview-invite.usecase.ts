import { isInviteUsable } from "../../domain/invite.policy";
import type { InviteTokens } from "../../domain/invite.ports";
import type { InviteRepository } from "../../domain/invite.repository";
import { fail } from "../../domain/list.errors";
import type { MemberRepository } from "../../domain/member.repository";

export class PreviewInviteUseCase {
  constructor(
    private readonly invites: InviteRepository,
    private readonly members: MemberRepository,
    private readonly tokens: InviteTokens,
  ) {}

  async execute(userId: string, token: string, now = new Date()) {
    const invite = await this.invites.findByTokenHash(this.tokens.hash(token));
    if (!invite) return fail("invite_invalid");

    const isMember = Boolean(await this.members.find(invite.listId, userId));
    if (!isMember && !isInviteUsable(invite, now)) return fail("invite_invalid");
    return { invite, isMember };
  }
}
