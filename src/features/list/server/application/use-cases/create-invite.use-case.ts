import type { CreateInviteInput } from "../../../schemas/list-api.schema";
import { fail } from "../../domain/errors/list.errors";
import { INVITE_TTL_MS } from "../../domain/policies/invite.policy";
import { canManage } from "../../domain/policies/list.policy";
import type { InviteTokens } from "../../domain/ports/invite.ports";
import type { InviteRepository } from "../../domain/repositories/invite.repository";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

type CreateInviteRequest = CreateInviteInput & { email?: string };

export class CreateInviteUseCase {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
    private readonly inviteTokens: InviteTokens,
  ) {}

  async execute(userId: string, listId: string, { role, email }: CreateInviteRequest, now = new Date()) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");
    if (!canManage(membership.role)) return fail("forbidden");

    const list = await this.listRepository.findById(listId);
    if (list?.isPrivate) return fail("forbidden");

    const { token, hash } = this.inviteTokens.create();
    const invite = await this.inviteRepository.create({
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
