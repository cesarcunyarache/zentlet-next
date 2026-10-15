import type { ListInvite, NewListInvite, StoredInvite } from "./invite.entity";

export interface InviteRepository {
  create(invite: NewListInvite): Promise<ListInvite>;

  findByTokenHash(tokenHash: string): Promise<StoredInvite | null>;

  findActive(listId: string, now: Date): Promise<ListInvite[]>;

  revoke(listId: string, inviteId: string, now: Date): Promise<boolean>;

  accept(inviteId: string, userId: string, now: Date): Promise<boolean>;
}
