import prisma from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { toDomain as transactionToDomain } from "@/features/transaction/server/infrastructure/persistence/prisma/transaction.mapper";
import type { EmailMovement } from "../../../../types";
import type { DateWindow, InboxItemAcceptance, NewInboxItem } from "../../../domain/entities/inbox-item.entity";
import type { InboxItemRepository } from "../../../domain/repositories/inbox-item.repository";
import { inboxItemToDomain } from "./inbox.mapper";

const MAX_PENDING = 100;

export class PrismaInboxItemRepository implements InboxItemRepository {
  async findPending(userId: string) {
    const rows = await prisma.inboxTransaction.findMany({
      where: { userId, status: "pending" },
      orderBy: [{ transactionDate: "desc" }, { receivedAt: "desc" }],
      take: MAX_PENDING,
    });
    return rows.map(inboxItemToDomain);
  }

  async findPendingOwned(userId: string, id: string) {
    const row = await prisma.inboxTransaction.findFirst({ where: { id, userId, status: "pending" } });
    if (!row) return null;
    return inboxItemToDomain(row);
  }

  async hasReference(userId: string, reference: string, amount: number) {
    const existing = await prisma.inboxTransaction.findFirst({
      where: { userId, reference, amount },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async insert(item: NewInboxItem) {
    try {
      await prisma.inboxTransaction.create({ data: item });
      return "created" as const;
    } catch (error) {
      if (isUniqueViolation(error)) return "duplicate" as const;
      throw error;
    }
  }

  async accept({ item, transaction, merchantKey }: InboxItemAcceptance) {
    const { userId, categoryId, description } = transaction;

    const created = await prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({ data: transaction });
      await tx.inboxTransaction.update({
        where: { id: item.id },
        data: { status: "accepted", transactionId: createdTransaction.id, categoryId, resolvedAt: new Date() },
      });
      if (merchantKey) {
        await tx.merchantRule.upsert({
          where: { userId_key: { userId, key: merchantKey } },
          create: { userId, key: merchantKey, categoryId, description },
          update: { categoryId, description, hits: { increment: 1 } },
        });
      }
      await tx.inboxSender.upsert({
        where: { userId_address: { userId, address: item.senderAddress } },
        create: { userId, address: item.senderAddress, status: "trusted", origin: "learned", acceptedCount: 1 },
        update: { acceptedCount: { increment: 1 } },
      });
      return createdTransaction;
    });

    return transactionToDomain(created);
  }

  async markDismissed(id: string) {
    await prisma.inboxTransaction.update({ where: { id }, data: { status: "dismissed", resolvedAt: new Date() } });
  }

  async categoryBelongsTo(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }

  findMatchableCategories(userId: string) {
    return prisma.category.findMany({ where: { userId }, select: { id: true, name: true, icon: true, color: true } });
  }

  async findSimilarTransactionId(userId: string, movement: EmailMovement, window: DateWindow) {
    const match = await prisma.transaction.findFirst({
      where: {
        userId,
        type: movement.type,
        amount: movement.amount,
        transactionDate: { gte: window.from, lte: window.to },
      },
      select: { id: true },
    });
    return match?.id ?? null;
  }
}
