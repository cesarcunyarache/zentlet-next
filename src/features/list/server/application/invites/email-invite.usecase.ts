import type { EmailInviteInput } from "../../../schemas/list-api.schema";
import type { InviteMailer } from "../../domain/invite.ports";
import type { InviteRepository } from "../../domain/invite.repository";
import { fail } from "../../domain/list.errors";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";
import type { CreateInviteUseCase } from "./create-invite.usecase";

export class EmailInviteUseCase {
  constructor(
    private readonly createInvite: CreateInviteUseCase,
    private readonly invites: InviteRepository,
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
    private readonly mailer: InviteMailer,
  ) {}

  async execute(userId: string, listId: string, { role, email, locale }: EmailInviteInput) {
    const created = await this.createInvite.execute(userId, listId, { role, email });
    if ("error" in created) return created;

    const list = await this.lists.findById(listId);
    const sent = await this.mailer.send({
      to: email,
      token: created.token,
      inviterName: await this.members.findName(userId),
      listName: list?.name ?? "",
      locale,
    });
    if (!sent) {
      await this.invites.revoke(listId, created.invite.id, new Date());
      return fail("email_failed");
    }
    return { invite: created.invite };
  }
}
