import type { ListRole } from "../../../types";
import type { TransactionList } from "./list.entity";

export type InviteRole = Exclude<ListRole, "owner">;

export interface ListInvite {
  id: string;
  listId: string;
  role: InviteRole;
  email: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface NewListInvite extends Omit<ListInvite, "createdAt"> {
  tokenHash: string;
  createdById: string;
}

export interface StoredInvite extends ListInvite {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  list: TransactionList & { ownerName: string; memberCount: number };
}
