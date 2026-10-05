import prisma from "@/lib/prisma";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import type { AcceptInboxItemInput } from "../schemas/inbox-api.schema";
import { merchantKey } from "../lib/merchant";
import { shouldAutoBlock } from "../lib/sender";

export type ReviewError = "not_found" | "category_not_found";

async function pendingItem(userId: string, id: string) {
  return prisma.inboxTransaction.findFirst({ where: { id, userId, status: "pending" } });
}

export async function acceptInboxItem(userId: string, id: string, input: AcceptInboxItemInput) {
  const item = await pendingItem(userId, id);
  if (!item) return { error: "not_found" as const };

  const category = await prisma.category.findFirst({ where: { id: input.categoryId, userId }, select: { id: true } });
  if (!category) return { error: "category_not_found" as const };

  const key = merchantKey(item.merchant ?? item.description);
  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        userId,
        description: input.description,
        amount: input.amount,
        type: input.type,
        categoryId: input.categoryId,
        transactionDate: new Date(input.transactionDate),
        reference: item.reference,
      },
    });
    await tx.inboxTransaction.update({
      where: { id: item.id },
      data: { status: "accepted", transactionId: created.id, categoryId: input.categoryId, resolvedAt: new Date() },
    });
    if (key) {
      await tx.merchantRule.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, categoryId: input.categoryId, description: input.description },
        update: { categoryId: input.categoryId, description: input.description, hits: { increment: 1 } },
      });
    }
    await tx.inboxSender.upsert({
      where: { userId_address: { userId, address: item.senderAddress } },
      create: { userId, address: item.senderAddress, status: "trusted", origin: "learned", acceptedCount: 1 },
      update: { acceptedCount: { increment: 1 } },
    });
    return created;
  });

  if (transaction.type === "expense") scheduleBudgetCheck(userId, transaction.categoryId);
  return { transaction };
}

export async function dismissInboxItem(userId: string, id: string) {
  const item = await pendingItem(userId, id);
  if (!item) return { error: "not_found" as const };

  await prisma.inboxTransaction.update({ where: { id: item.id }, data: { status: "dismissed", resolvedAt: new Date() } });
  const sender = await prisma.inboxSender.upsert({
    where: { userId_address: { userId, address: item.senderAddress } },
    create: { userId, address: item.senderAddress, status: "trusted", origin: "learned", dismissedCount: 1 },
    update: { dismissedCount: { increment: 1 } },
  });
  if (sender.status === "trusted" && shouldAutoBlock(item.senderAddress, sender)) {
    await prisma.inboxSender.update({ where: { id: sender.id }, data: { status: "blocked" } });
  }
  return { ok: true as const };
}
