import { CURRENCIES } from "@/features/preference/lib/currency";
import type { CategoryLike, TTransaction } from "@/features/transaction/types";
import type { TListEntry } from "../types";

export function toTransaction(entry: TListEntry): TTransaction {
  return {
    id: entry.id,
    description: entry.description,
    amount: entry.amount,
    type: entry.type,
    categoryId: entry.categoryId,
    transactionDate: entry.transactionDate,
  };
}

export function entryCategories(entries: TListEntry[]) {
  return new Map<string, CategoryLike>(entries.map(({ category }) => [category.id, category]));
}

export const netTotal = ({ incomeTotal, expenseTotal }: { incomeTotal: number; expenseTotal: number }) =>
  incomeTotal - expenseTotal;

interface CategoryTotalLike {
  name: string;
  icon: string;
  expense: number;
  income: number;
}

const categoryKey = ({ name, icon }: CategoryTotalLike) => `${name.trim().toLocaleLowerCase()}|${icon}`;

export function mergeCategoriesByName<T extends CategoryTotalLike>(categories: T[]) {
  const merged = new Map<string, T>();
  for (const category of categories) {
    const key = categoryKey(category);
    const current = merged.get(key);
    merged.set(
      key,
      current
        ? { ...current, expense: current.expense + category.expense, income: current.income + category.income }
        : category,
    );
  }
  return [...merged.values()];
}

export function sortCategoriesBySpend<T extends { expense: number; income: number }>(categories: T[]) {
  return [...categories].sort((a, b) => b.expense + b.income - (a.expense + a.income));
}

export function currencyOf(code: string) {
  return CURRENCIES.find((currency) => currency.code === code)?.symbol ?? code;
}
