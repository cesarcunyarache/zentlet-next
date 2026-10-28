import prisma from "@/lib/prisma";
import type { NewListInvite } from "../../../domain/entities/invite.entity";
import type { InviteRepository } from "../../../domain/repositories/invite.repository";
import { toDomain, toInvite } from "./list.mapper";

const usableInvite = (now: Date) => ({ acceptedAt: null, revokedAt: null, expiresAt: { gt: now } });

export class PrismaInviteRepository implements InviteRepository {
  async create(invite: NewListInvite) {
    const row = await prisma.transactionListInvite.create({ data: invite });
    return toInvite(row);
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
      list: { ...toDomain(list), ownerName: owner.name, memberCount: _count.members },
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
    if (count === 0) return "not_revocable" as const;
    return "revoked" as const;
  }

  async accept(inviteId: string, userId: string, now: Date) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.transactionListInvite.findUnique({ where: { id: inviteId } });
      if (!invite) return "not_usable" as const;

      const { count } = await tx.transactionListInvite.updateMany({
        where: { id: inviteId, ...usableInvite(now) },
        data: { acceptedAt: now },
      });
      if (count === 0) return "not_usable" as const;

      await tx.transactionListMember.create({ data: { listId: invite.listId, userId, role: invite.role } });
      return "accepted" as const;
    });
  }
}
