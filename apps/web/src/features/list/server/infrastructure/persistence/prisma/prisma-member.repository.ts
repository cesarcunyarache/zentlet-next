import prisma from "@/lib/prisma";
import { moveToPrivateLists } from "@/lib/private-list";
import type { ListRole } from "../../../../types";
import type { MemberRepository } from "../../../domain/repositories/member.repository";

export class PrismaMemberRepository implements MemberRepository {
  async find(listId: string, userId: string) {
    return prisma.transactionListMember.findUnique({ where: { listId_userId: { listId, userId } } });
  }

  async findAll(listId: string) {
    return prisma.transactionListMember.findMany({ where: { listId }, orderBy: { joinedAt: "asc" } });
  }

  async findName(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return user?.name ?? "";
  }

  async updateRole(listId: string, userId: string, role: ListRole) {
    await prisma.transactionListMember.update({ where: { listId_userId: { listId, userId } }, data: { role } });
  }

  async remove(listId: string, userId: string) {
    await prisma.$transaction(async (tx) => {
      await moveToPrivateLists(tx, { listId, userId });
      await tx.transactionListMember.deleteMany({ where: { listId, userId } });
    });
  }

  async transferOwnership(listId: string, fromUserId: string, toUserId: string) {
    await prisma.$transaction([
      prisma.transactionList.update({ where: { id: listId }, data: { ownerId: toUserId } }),
      prisma.transactionListMember.update({
        where: { listId_userId: { listId, userId: toUserId } },
        data: { role: "owner" },
      }),
      prisma.transactionListMember.deleteMany({ where: { listId, userId: fromUserId } }),
    ]);
  }
}
