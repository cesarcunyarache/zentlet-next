import { fail } from "../../domain/errors/list.errors";
import { isInviteUsable } from "../../domain/policies/invite.policy";
import type { InviteTokens } from "../../domain/ports/invite.ports";
import type { AccountCurrency, ListNotifier } from "../../domain/ports/list.ports";
import type { InviteRepository } from "../../domain/repositories/invite.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class AcceptInviteUseCase {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly memberRepository: MemberRepository,
    private readonly inviteTokens: InviteTokens,
    private readonly accountCurrency: AccountCurrency,
    private readonly listNotifier: ListNotifier,
  ) {}

  async execute(userId: string, token: string, now = new Date()) {
    const invite = await this.inviteRepository.findByTokenHash(this.inviteTokens.hash(token));
    if (!invite) return fail("invite_invalid");

    const existingMembership = await this.memberRepository.find(invite.listId, userId);
    if (existingMembership) return { listId: invite.listId, joined: false };

    if (!isInviteUsable(invite, now)) return fail("invite_invalid");

    if (invite.role === "editor") {
      const userCurrency = await this.accountCurrency.of(userId);
      if (invite.list.currency !== userCurrency) return fail("currency_mismatch");
    }

    const accepted = await this.inviteRepository.accept(invite.id, userId, now);
    if (accepted === "not_usable") return fail("invite_invalid");

    const memberName = await this.memberRepository.findName(userId);
    await this.listNotifier.memberJoined(invite.list.ownerId, {
      listId: invite.listId,
      listName: invite.list.name,
      memberName,
    });

    return { listId: invite.listId, joined: true };
  }
}
