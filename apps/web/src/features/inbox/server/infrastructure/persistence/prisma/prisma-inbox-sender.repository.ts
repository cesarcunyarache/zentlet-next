import prisma from "@/lib/prisma";
import type { InboxSenderRepository } from "../../../domain/repositories/inbox-sender.repository";
import { inboxSenderToDomain } from "./inbox.mapper";

export class PrismaInboxSenderRepository implements InboxSenderRepository {
  async findAll(userId: string) {
    const rows = await prisma.inboxSender.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return rows.map(inboxSenderToDomain);
  }

  async findRules(userId: string) {
    const rows = await prisma.inboxSender.findMany({ where: { userId } });
    return rows.map(inboxSenderToDomain);
  }

  async trust(userId: string, address: string) {
    const row = await prisma.inboxSender.upsert({
      where: { userId_address: { userId, address } },
      create: { userId, address, status: "trusted", origin: "manual" },
      update: { status: "trusted", origin: "manual" },
    });
    return inboxSenderToDomain(row);
  }

  async recordDismissal(userId: string, address: string) {
    const row = await prisma.inboxSender.upsert({
      where: { userId_address: { userId, address } },
      create: { userId, address, status: "trusted", origin: "learned", dismissedCount: 1 },
      update: { dismissedCount: { increment: 1 } },
    });
    return inboxSenderToDomain(row);
  }

  async block(id: string) {
    await prisma.inboxSender.update({ where: { id }, data: { status: "blocked" } });
  }

  async deleteOwned(userId: string, id: string) {
    const { count } = await prisma.inboxSender.deleteMany({ where: { id, userId } });
    if (count === 0) return "not_found" as const;
    return "deleted" as const;
  }
}
