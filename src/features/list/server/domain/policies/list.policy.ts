import type { ListRole } from "../../../types";
import type { ListMembership } from "../entities/member.entity";

const SUCCESSION_ORDER: ListRole[] = ["editor", "viewer"];

export const canManage = (role: ListRole) => role === "owner";

export const canContribute = (role: ListRole) => role === "owner" || role === "editor";

export const canRemoveEntry = (role: ListRole, isAuthor: boolean) => canManage(role) || isAuthor;

function bySuccessionPriority(a: ListMembership, b: ListMembership) {
  const roleDifference = SUCCESSION_ORDER.indexOf(a.role) - SUCCESSION_ORDER.indexOf(b.role);
  if (roleDifference !== 0) return roleDifference;

  return a.joinedAt.getTime() - b.joinedAt.getTime();
}

export function pickSuccessor(members: ListMembership[], ownerId: string): ListMembership | null {
  const candidates = members.filter((member) => member.userId !== ownerId && member.role !== "owner");
  const [successor] = candidates.sort(bySuccessionPriority);
  return successor ?? null;
}
