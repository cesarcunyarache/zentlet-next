import { AssignEntriesUseCase } from "../application/entries/assign-entries.usecase";
import { ListEntriesUseCase } from "../application/entries/list-entries.usecase";
import { RemoveEntryUseCase } from "../application/entries/remove-entry.usecase";
import { AcceptInviteUseCase } from "../application/invites/accept-invite.usecase";
import { CreateInviteUseCase } from "../application/invites/create-invite.usecase";
import { EmailInviteUseCase } from "../application/invites/email-invite.usecase";
import { ListInvitesUseCase } from "../application/invites/list-invites.usecase";
import { PreviewInviteUseCase } from "../application/invites/preview-invite.usecase";
import { RevokeInviteUseCase } from "../application/invites/revoke-invite.usecase";
import { CreateListUseCase } from "../application/list/create-list.usecase";
import { DeleteListUseCase } from "../application/list/delete-list.usecase";
import { GetListUseCase } from "../application/list/get-list.usecase";
import { HandOverListsUseCase } from "../application/list/hand-over-lists.usecase";
import { ListListsUseCase } from "../application/list/list-lists.usecase";
import { UpdateListUseCase } from "../application/list/update-list.usecase";
import { RemoveMemberUseCase } from "../application/members/remove-member.usecase";
import { UpdateMemberUseCase } from "../application/members/update-member.usecase";
import { accountCurrency, inviteMailer, inviteTokens, listNotifier } from "./list.adapters";
import { PrismaInviteRepository } from "./prisma-invite.repository";
import { PrismaListRepository } from "./prisma-list.repository";
import { PrismaMemberRepository } from "./prisma-member.repository";

const lists = new PrismaListRepository();
const members = new PrismaMemberRepository();
const invites = new PrismaInviteRepository();
const createInvite = new CreateInviteUseCase(invites, members, inviteTokens);

export const listUseCases = {
  list: new ListListsUseCase(lists),
  get: new GetListUseCase(lists, members),
  create: new CreateListUseCase(lists, accountCurrency),
  update: new UpdateListUseCase(lists, members),
  delete: new DeleteListUseCase(lists, members),
  handOver: new HandOverListsUseCase(lists, members, listNotifier),
  entries: new ListEntriesUseCase(lists, members),
  assign: new AssignEntriesUseCase(lists, members, accountCurrency),
  removeEntry: new RemoveEntryUseCase(lists, members),
  updateMember: new UpdateMemberUseCase(members),
  removeMember: new RemoveMemberUseCase(members),
  createInvite,
  emailInvite: new EmailInviteUseCase(createInvite, invites, lists, members, inviteMailer),
  invites: new ListInvitesUseCase(invites, members),
  revokeInvite: new RevokeInviteUseCase(invites, members),
  previewInvite: new PreviewInviteUseCase(invites, members, inviteTokens),
  acceptInvite: new AcceptInviteUseCase(invites, members, inviteTokens, accountCurrency, listNotifier),
};
