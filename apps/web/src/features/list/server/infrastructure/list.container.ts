import { AcceptInviteUseCase } from "../application/use-cases/accept-invite.use-case";
import { AssignEntriesUseCase } from "../application/use-cases/assign-entries.use-case";
import { CreateInviteUseCase } from "../application/use-cases/create-invite.use-case";
import { CreateListUseCase } from "../application/use-cases/create-list.use-case";
import { DeleteListUseCase } from "../application/use-cases/delete-list.use-case";
import { EmailInviteUseCase } from "../application/use-cases/email-invite.use-case";
import { GetListUseCase } from "../application/use-cases/get-list.use-case";
import { HandOverListsUseCase } from "../application/use-cases/hand-over-lists.use-case";
import { ListEntriesUseCase } from "../application/use-cases/list-entries.use-case";
import { ListInvitesUseCase } from "../application/use-cases/list-invites.use-case";
import { ListListsUseCase } from "../application/use-cases/list-lists.use-case";
import { PreviewInviteUseCase } from "../application/use-cases/preview-invite.use-case";
import { RemoveEntryUseCase } from "../application/use-cases/remove-entry.use-case";
import { RemoveMemberUseCase } from "../application/use-cases/remove-member.use-case";
import { RevokeInviteUseCase } from "../application/use-cases/revoke-invite.use-case";
import { UpdateListUseCase } from "../application/use-cases/update-list.use-case";
import { UpdateMemberUseCase } from "../application/use-cases/update-member.use-case";
import { accountCurrency, inviteMailer, inviteTokens, listNotifier } from "./list.adapters";
import { PrismaInviteRepository } from "./persistence/prisma/prisma-invite.repository";
import { PrismaListRepository } from "./persistence/prisma/prisma-list.repository";
import { PrismaMemberRepository } from "./persistence/prisma/prisma-member.repository";

const listRepository = new PrismaListRepository();
const memberRepository = new PrismaMemberRepository();
const inviteRepository = new PrismaInviteRepository();
const createInvite = new CreateInviteUseCase(inviteRepository, listRepository, memberRepository, inviteTokens);

export const listUseCases = {
  list: new ListListsUseCase(listRepository),
  get: new GetListUseCase(listRepository, memberRepository),
  create: new CreateListUseCase(listRepository, accountCurrency),
  update: new UpdateListUseCase(listRepository, memberRepository),
  delete: new DeleteListUseCase(listRepository, memberRepository),
  handOver: new HandOverListsUseCase(listRepository, memberRepository, listNotifier),
  entries: new ListEntriesUseCase(listRepository, memberRepository),
  assign: new AssignEntriesUseCase(listRepository, memberRepository, accountCurrency),
  removeEntry: new RemoveEntryUseCase(listRepository, memberRepository),
  updateMember: new UpdateMemberUseCase(memberRepository),
  removeMember: new RemoveMemberUseCase(memberRepository),
  createInvite,
  emailInvite: new EmailInviteUseCase(createInvite, inviteRepository, listRepository, memberRepository, inviteMailer),
  invites: new ListInvitesUseCase(inviteRepository, memberRepository),
  revokeInvite: new RevokeInviteUseCase(inviteRepository, memberRepository),
  previewInvite: new PreviewInviteUseCase(inviteRepository, memberRepository, inviteTokens),
  acceptInvite: new AcceptInviteUseCase(inviteRepository, memberRepository, inviteTokens, accountCurrency, listNotifier),
};
