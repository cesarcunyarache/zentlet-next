import type { ListInvite, NewListInvite, StoredInvite } from "../entities/invite.entity";

export interface InviteRepository {
  create(invite: NewListInvite): Promise<ListInvite>;

  findByTokenHash(tokenHash: string): Promise<StoredInvite | null>;

  findActive(listId: string, now: Date): Promise<ListInvite[]>;

  revoke(listId: string, inviteId: string, now: Date): Promise<"revoked" | "not_revocable">;

  accept(inviteId: string, userId: string, now: Date): Promise<"accepted" | "not_usable">;
}
