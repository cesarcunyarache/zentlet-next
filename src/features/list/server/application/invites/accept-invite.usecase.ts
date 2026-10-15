import { isInviteUsable } from "../../domain/invite.policy";
import type { InviteTokens } from "../../domain/invite.ports";
import type { InviteRepository } from "../../domain/invite.repository";
import { fail } from "../../domain/list.errors";
import type { AccountCurrency, ListNotifier } from "../../domain/list.ports";
import type { MemberRepository } from "../../domain/member.repository";

export class AcceptInviteUseCase {
  constructor(
    private readonly invites: InviteRepository,
    private readonly members: MemberRepository,
    private readonly tokens: InviteTokens,
    private readonly currency: AccountCurrency,
    private readonly notifier: ListNotifier,
  ) {}

  async execute(userId: string, token: string, now = new Date()) {
    const invite = await this.invites.findByTokenHash(this.tokens.hash(token));
    if (!invite) return fail("invite_invalid");
    if (await this.members.find(invite.listId, userId)) return { listId: invite.listId, joined: false };
    if (!isInviteUsable(invite, now)) return fail("invite_invalid");
    if (invite.role === "editor" && invite.list.currency !== (await this.currency.of(userId))) {
      return fail("currency_mismatch");
    }

    if (!(await this.invites.accept(invite.id, userId, now))) return fail("invite_invalid");

    await this.notifier.memberJoined(invite.list.ownerId, {
      listId: invite.listId,
      listName: invite.list.name,
      memberName: await this.members.findName(userId),
    });
    return { listId: invite.listId, joined: true };
  }
}
