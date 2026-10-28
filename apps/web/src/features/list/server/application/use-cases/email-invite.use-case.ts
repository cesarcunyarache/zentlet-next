import type { EmailInviteInput } from "../../../schemas/list-api.schema";
import { fail } from "../../domain/errors/list.errors";
import type { InviteMailer } from "../../domain/ports/invite.ports";
import type { InviteRepository } from "../../domain/repositories/invite.repository";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";
import type { CreateInviteUseCase } from "./create-invite.use-case";

export class EmailInviteUseCase {
  constructor(
    private readonly createInvite: CreateInviteUseCase,
    private readonly inviteRepository: InviteRepository,
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
    private readonly inviteMailer: InviteMailer,
  ) {}

  async execute(userId: string, listId: string, { role, email, locale }: EmailInviteInput) {
    const created = await this.createInvite.execute(userId, listId, { role, email });
    if ("error" in created) return created;

    const list = await this.listRepository.findById(listId);
    const inviterName = await this.memberRepository.findName(userId);

    const sent = await this.inviteMailer.send({
      to: email,
      token: created.token,
      inviterName,
      listName: list?.name ?? "",
      locale,
    });

    if (!sent) {
      await this.inviteRepository.revoke(listId, created.invite.id, new Date());
      return fail("email_failed");
    }

    return { invite: created.invite };
  }
}
