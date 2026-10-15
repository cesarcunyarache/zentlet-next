import type { ListRole } from "../../types";

export interface ListMembership {
  listId: string;
  userId: string;
  role: ListRole;
  joinedAt: Date;
}
