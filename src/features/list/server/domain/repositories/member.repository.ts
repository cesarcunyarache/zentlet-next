import type { ListRole } from "../../types";
import type { ListMembership } from "./member.entity";

export interface MemberRepository {
  find(listId: string, userId: string): Promise<ListMembership | null>;

  findAll(listId: string): Promise<ListMembership[]>;

  findName(userId: string): Promise<string>;

  updateRole(listId: string, userId: string, role: ListRole): Promise<void>;

  remove(listId: string, userId: string): Promise<void>;

  transferOwnership(listId: string, fromUserId: string, toUserId: string): Promise<void>;
}
