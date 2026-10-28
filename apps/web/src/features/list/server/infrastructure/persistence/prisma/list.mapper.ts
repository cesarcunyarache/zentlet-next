import type {
  Category as CategoryRow,
  Transaction as TransactionRow,
  TransactionList as TransactionListRow,
  TransactionListInvite as InviteRow,
} from "@/generated/prisma/client";
import type { TransactionType } from "@/features/transaction/types";
import type { InviteRole, ListInvite } from "../../../domain/entities/invite.entity";
import type { ListEntry, TransactionList } from "../../../domain/entities/list.entity";

type EntryRow = TransactionRow & { category: Pick<CategoryRow, "id" | "name" | "icon" | "color"> };

export function toDomain(row: TransactionListRow): TransactionList {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    description: row.description,
    currency: row.currency,
    ownerId: row.ownerId,
    isPrivate: row.privateOwnerId !== null,
    createdAt: row.createdAt,
  };
}

export function toInvite(row: InviteRow): ListInvite {
  return {
    id: row.id,
    listId: row.listId,
    role: row.role as InviteRole,
    email: row.email,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export function toEntry(row: EntryRow): ListEntry {
  return {
    id: row.id,
    userId: row.userId,
    description: row.description,
    amount: Number(row.amount),
    type: row.type as TransactionType,
    categoryId: row.categoryId,
    transactionDate: row.transactionDate,
    createdAt: row.createdAt,
    category: row.category,
  };
}
