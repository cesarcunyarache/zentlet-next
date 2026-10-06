import prisma from "@/lib/prisma";
import { toUTCISODate } from "@/lib/dates";
import { userLocalDate } from "@/features/preference/server/timezone";
import { nextOccurrenceAfter } from "../lib/schedule";
import { serializeRecurringTransaction } from "../lib/serialize";
import type { RecurrenceFrequency } from "../types";

export interface TransactionSeed {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string;
  categoryId: string;
  reference: string | null;
  transactionDate: Date;
}

const laterOf = (a: string, b: string) => (a > b ? a : b);

async function firstDueDate(seed: TransactionSeed, frequency: RecurrenceFrequency) {
  const anchorDate = toUTCISODate(seed.transactionDate);
  const today = await userLocalDate(seed.userId);
  return new Date(nextOccurrenceAfter(anchorDate, frequency, laterOf(anchorDate, today)));
}

export async function createRepeatingTransaction(seed: TransactionSeed, frequency: RecurrenceFrequency) {
  const { userId, type, amount, description, categoryId, transactionDate } = seed;
  const nextDueDate = await firstDueDate(seed, frequency);
  return prisma.$transaction(async (tx) => {
    const recurring = await tx.recurringTransaction.create({
      data: { userId, type, amount, description, categoryId, frequency, anchorDate: transactionDate, nextDueDate },
    });
    return tx.transaction.create({ data: { ...seed, recurringTransactionId: recurring.id } });
  });
}

export async function getRecurringTransaction(userId: string, id: string) {
  const recurring = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  return recurring ? serializeRecurringTransaction(recurring) : null;
}

export async function stopRecurringTransaction(userId: string, id: string) {
  const { count } = await prisma.recurringTransaction.deleteMany({ where: { id, userId } });
  return count > 0;
}
