import type { TransactionType } from "@/features/transaction/types";
import type { ListRole, ListTotals } from "../../types";

export interface TransactionList {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  currency: string;
  ownerId: string;
  createdAt: Date;
}

export type NewTransactionList = Omit<TransactionList, "createdAt">;

export type ListChanges = Partial<Pick<TransactionList, "name" | "icon" | "color" | "description">>;

export interface ListOverview extends TransactionList, ListTotals {
  role: ListRole;
  memberCount: number;
}

export interface ListCategoryTotal {
  id: string;
  name: string;
  icon: string;
  color: string;
  expense: number;
  income: number;
}

export interface ListMemberTotal {
  userId: string;
  name: string;
  image: string | null;
  role: ListRole;
  expense: number;
  income: number;
  count: number;
}

export interface ListBreakdown extends ListTotals {
  memberCount: number;
  byCategory: ListCategoryTotal[];
  members: ListMemberTotal[];
}

export interface ListEntry {
  id: string;
  userId: string;
  description: string | null;
  amount: number;
  type: TransactionType;
  categoryId: string;
  transactionDate: Date;
  createdAt: Date;
  category: { id: string; name: string; icon: string; color: string };
}

export interface EntryCursor {
  date: string;
  createdAt: string;
  id: string;
}
