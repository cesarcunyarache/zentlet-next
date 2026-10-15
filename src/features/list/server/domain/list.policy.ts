import type { ListRole } from "../../types";
import type { ListMembership } from "./member.entity";

const SUCCESSION_ORDER: ListRole[] = ["editor", "viewer"];

export const canManage = (role: ListRole) => role === "owner";

export const canContribute = (role: ListRole) => role === "owner" || role === "editor";

export const canRemoveEntry = (role: ListRole, isAuthor: boolean) => canManage(role) || isAuthor;

export function pickSuccessor(members: ListMembership[], ownerId: string): ListMembership | null {
  const candidates = members.filter((member) => member.userId !== ownerId && member.role !== "owner");
  const ranked = [...candidates].sort(
    (a, b) =>
      SUCCESSION_ORDER.indexOf(a.role) - SUCCESSION_ORDER.indexOf(b.role) ||
      a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  return ranked[0] ?? null;
}
