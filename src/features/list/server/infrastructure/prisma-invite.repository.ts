import prisma from "@/lib/prisma";
import type { TransactionListInvite as InviteRow } from "@/generated/prisma/client";
import type { InviteRole, ListInvite, NewListInvite } from "../domain/invite.entity";
import type { InviteRepository } from "../domain/invite.repository";
import { toEntity } from "./prisma-list.repository";

function toInvite(row: InviteRow): ListInvite {
  return {
    id: row.id,
    listId: row.listId,
    role: row.role as InviteRole,
    email: row.email,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

const usableInvite = (now: Date) => ({ acceptedAt: null, revokedAt: null, expiresAt: { gt: now } });

export class PrismaInviteRepository implements InviteRepository {
  async create(invite: NewListInvite) {
    return toInvite(await prisma.transactionListInvite.create({ data: invite }));
  }

  async findByTokenHash(tokenHash: string) {
    const row = await prisma.transactionListInvite.findUnique({
      where: { tokenHash },
      include: {
        list: { include: { owner: { select: { name: true } }, _count: { select: { members: true } } } },
      },
    });
    if (!row) return null;
    const { owner, _count, ...list } = row.list;
    return {
      ...toInvite(row),
      acceptedAt: row.acceptedAt,
      revokedAt: row.revokedAt,
      list: { ...toEntity(list), ownerName: owner.name, memberCount: _count.members },
    };
  }

  async findActive(listId: string, now: Date) {
    const rows = await prisma.transactionListInvite.findMany({
      where: { listId, ...usableInvite(now) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toInvite);
  }

  async revoke(listId: string, inviteId: string, now: Date) {
    const { count } = await prisma.transactionListInvite.updateMany({
      where: { id: inviteId, listId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    return count > 0;
  }

  async accept(inviteId: string, userId: string, now: Date) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.transactionListInvite.findUnique({ where: { id: inviteId } });
      if (!invite) return false;
      const { count } = await tx.transactionListInvite.updateMany({
        where: { id: inviteId, ...usableInvite(now) },
        data: { acceptedAt: now },
      });
      if (count === 0) return false;
      await tx.transactionListMember.create({ data: { listId: invite.listId, userId, role: invite.role } });
      return true;
    });
  }
}
