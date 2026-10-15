import type { TransactionType } from "@/features/transaction/types";

export const LIST_ROLES = ["owner", "editor", "viewer"] as const;

export type ListRole = (typeof LIST_ROLES)[number];

export interface ListTotals {
  count: number;
  expenseTotal: number;
  incomeTotal: number;
}

export interface TList extends ListTotals {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  currency: string;
  role: ListRole;
  memberCount: number;
}

export interface TListCategoryTotal {
  id: string;
  name: string;
  icon: string;
  color: string;
  expense: number;
  income: number;
}

export interface TListMember {
  userId: string;
  name: string;
  image: string | null;
  role: ListRole;
  expense: number;
  income: number;
  count: number;
}

export interface TListDetail extends TList {
  byCategory: TListCategoryTotal[];
  members: TListMember[];
}

export interface TListEntry {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  transactionDate: string;
  authorId: string;
  category: { id: string; name: string; icon: string; color: string };
}

export interface TListEntryPage {
  items: TListEntry[];
  nextCursor: string | null;
}

export interface TListPayload {
  name: string;
  icon: string;
  color: string;
  description?: string | null;
}

export type InviteRole = Exclude<ListRole, "owner">;

export interface TListInvite {
  id: string;
  role: InviteRole;
  email: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface TCreatedInvite extends TListInvite {
  token: string;
}

export interface TInvitePreview {
  listId: string;
  name: string;
  icon: string;
  color: string;
  currency: string;
  ownerName: string;
  memberCount: number;
  role: InviteRole;
  isMember: boolean;
}
