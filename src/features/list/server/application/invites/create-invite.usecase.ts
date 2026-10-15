import type { CreateInviteInput } from "../../../schemas/list-api.schema";
import { INVITE_TTL_MS } from "../../domain/invite.policy";
import type { InviteTokens } from "../../domain/invite.ports";
import type { InviteRepository } from "../../domain/invite.repository";
import { fail } from "../../domain/list.errors";
import { canManage } from "../../domain/list.policy";
import type { MemberRepository } from "../../domain/member.repository";

export class CreateInviteUseCase {
  constructor(
    private readonly invites: InviteRepository,
    private readonly members: MemberRepository,
    private readonly tokens: InviteTokens,
  ) {}

  async execute(userId: string, listId: string, { role, email }: CreateInviteInput & { email?: string }, now = new Date()) {
    const membership = await this.members.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    const { token, hash } = this.tokens.create();
    const invite = await this.invites.create({
      id: crypto.randomUUID(),
      listId,
      role,
      email: email ?? null,
      tokenHash: hash,
      createdById: userId,
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    });
    return { invite, token };
  }
}
