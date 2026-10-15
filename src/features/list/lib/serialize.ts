import { toUTCISODate } from "@/lib/dates";
import type { ListInvite, StoredInvite } from "../server/domain/invite.entity";
import type { ListBreakdown, ListEntry, ListOverview, TransactionList } from "../server/domain/list.entity";
import type { ListRole, TInvitePreview, TList, TListDetail, TListEntry, TListInvite } from "../types";

export function serializeList(list: ListOverview): TList {
  return {
    id: list.id,
    name: list.name,
    icon: list.icon,
    color: list.color,
    description: list.description,
    currency: list.currency,
    role: list.role,
    memberCount: list.memberCount,
    isPrivate: list.isPrivate,
    count: list.count,
    expenseTotal: list.expenseTotal,
    incomeTotal: list.incomeTotal,
  };
}

export function serializeListDetail(list: TransactionList, role: ListRole, breakdown: ListBreakdown): TListDetail {
  return { ...serializeList({ ...list, ...breakdown, role }), byCategory: breakdown.byCategory, members: breakdown.members };
}

export function serializeEntry(entry: ListEntry): TListEntry {
  return {
    id: entry.id,
    description: entry.description ?? "",
    amount: entry.amount,
    type: entry.type,
    categoryId: entry.categoryId,
    transactionDate: toUTCISODate(entry.transactionDate),
    authorId: entry.userId,
    category: entry.category,
  };
}

export function serializeInvite(invite: ListInvite): TListInvite {
  return {
    id: invite.id,
    role: invite.role,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
}

export function serializeInvitePreview(invite: StoredInvite, isMember: boolean): TInvitePreview {
  const { list } = invite;
  return {
    listId: list.id,
    name: list.name,
    icon: list.icon,
    color: list.color,
    currency: list.currency,
    ownerName: list.ownerName,
    memberCount: list.memberCount,
    role: invite.role,
    isMember,
  };
}
