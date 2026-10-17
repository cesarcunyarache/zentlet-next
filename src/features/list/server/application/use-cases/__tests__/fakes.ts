import { vi } from "vitest";
import type { ListRole } from "../../../../types";
import type { StoredInvite } from "../../../domain/entities/invite.entity";
import type { InviteTokens } from "../../../domain/ports/invite.ports";
import type { InviteRepository } from "../../../domain/repositories/invite.repository";
import type { TransactionList } from "../../../domain/entities/list.entity";
import type { AccountCurrency, ListNotifier } from "../../../domain/ports/list.ports";
import type { ListRepository } from "../../../domain/repositories/list.repository";
import type { ListMembership } from "../../../domain/entities/member.entity";
import type { MemberRepository } from "../../../domain/repositories/member.repository";

export const OWNER = "owner-1";
export const LIST_ID = "6f1c2a3b-4d5e-4f60-8a1b-2c3d4e5f6a7b";

export const storedList: TransactionList = {
  id: LIST_ID,
  name: "Viaje a Cusco",
  icon: "🏔️",
  color: "#D6E8F7",
  description: null,
  currency: "PEN",
  ownerId: OWNER,
  isPrivate: false,
  createdAt: new Date("2026-10-01T00:00:00Z"),
};

export function membership(userId: string, role: ListRole, joinedAt = new Date("2026-10-01T00:00:00Z")): ListMembership {
  return { listId: LIST_ID, userId, role, joinedAt };
}

export function storedInvite(overrides: Partial<StoredInvite> = {}): StoredInvite {
  return {
    id: "invite-1",
    listId: LIST_ID,
    role: "editor",
    email: null,
    expiresAt: new Date("2026-10-15T00:00:00Z"),
    createdAt: new Date("2026-10-08T00:00:00Z"),
    acceptedAt: null,
    revokedAt: null,
    list: { ...storedList, ownerName: "Ana", memberCount: 1 },
    ...overrides,
  };
}

export function fakeLists(overrides: Partial<ListRepository> = {}): ListRepository {
  return {
    findById: vi.fn().mockResolvedValue(storedList),
    findOverviews: vi.fn().mockResolvedValue([]),
    findBreakdown: vi.fn(),
    findOwnedIds: vi.fn().mockResolvedValue([]),
    ensurePrivate: vi.fn().mockResolvedValue("private-list"),
    insert: vi.fn(async (list) => ({ ...list, isPrivate: false, createdAt: new Date() })),
    update: vi.fn(async (_id, changes) => ({ ...storedList, ...changes })),
    delete: vi.fn().mockResolvedValue(undefined),
    findEntries: vi.fn().mockResolvedValue([]),
    findEntryAuthor: vi.fn().mockResolvedValue(OWNER),
    countOwnedTransactions: vi.fn(async (_userId, ids: string[]) => ids.length),
    assign: vi.fn(async (_listId, _userId, ids: string[]) => ids.length),
    unassign: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function fakeMembers(overrides: Partial<MemberRepository> = {}): MemberRepository {
  return {
    find: vi.fn().mockResolvedValue(membership(OWNER, "owner")),
    findAll: vi.fn().mockResolvedValue([membership(OWNER, "owner")]),
    findName: vi.fn().mockResolvedValue("Ana"),
    updateRole: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    transferOwnership: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export const membersWithRoles = (roles: Record<string, ListRole>) =>
  fakeMembers({
    find: vi.fn(async (_listId: string, userId: string) => (roles[userId] ? membership(userId, roles[userId]) : null)),
  });

export function fakeInvites(overrides: Partial<InviteRepository> = {}): InviteRepository {
  return {
    create: vi.fn(async ({ id, listId, role, email, expiresAt }) => ({
      id,
      listId,
      role,
      email,
      expiresAt,
      createdAt: new Date(),
    })),
    findByTokenHash: vi.fn().mockResolvedValue(null),
    findActive: vi.fn().mockResolvedValue([]),
    revoke: vi.fn().mockResolvedValue("revoked"),
    accept: vi.fn().mockResolvedValue("accepted"),
    ...overrides,
  };
}

export const fakeCurrency = (code = "PEN"): AccountCurrency => ({ of: vi.fn().mockResolvedValue(code) });

export const fakeTokens = (): InviteTokens => ({
  create: vi.fn(() => ({ token: "plain-token-1234567890", hash: "hashed" })),
  hash: vi.fn((token: string) => `hash:${token}`),
});

export const fakeNotifier = (): ListNotifier => ({
  memberJoined: vi.fn().mockResolvedValue(undefined),
  ownershipReceived: vi.fn().mockResolvedValue(undefined),
});
