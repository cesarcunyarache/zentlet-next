import type { InfiniteData } from "@tanstack/react-query";
import type {
  DateRange,
  TTransaction,
  TransactionFilters,
  TransactionPage,
  TransactionSummary,
} from "../types";

export type FeedData = InfiniteData<TransactionPage, string | null>;

export function inRange(date: string, { from, to }: DateRange) {
  return (!from || date >= from) && (!to || date < to);
}

export function matchesFilters(tx: TTransaction, filters: TransactionFilters) {
  if (!inRange(tx.transactionDate, filters)) return false;
  if (filters.type && tx.type !== filters.type) return false;
  if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
  if (filters.q && !tx.description.toLowerCase().includes(filters.q.toLowerCase())) return false;
  return true;
}

function withoutItem(page: TransactionPage, id: string): TransactionPage {
  return { ...page, items: page.items.filter((item) => item.id !== id) };
}

export function insertIntoFeed(data: FeedData, tx: TTransaction): FeedData {
  const pages = data.pages.map((page) => withoutItem(page, tx.id));

  for (const page of pages) {
    const index = page.items.findIndex((item) => item.transactionDate <= tx.transactionDate);
    if (index >= 0) {
      page.items.splice(index, 0, tx);
      return { ...data, pages };
    }
  }

  const last = pages[pages.length - 1];
  if (last && !last.nextCursor) last.items.push(tx);
  return { ...data, pages };
}

export function removeFromFeed(data: FeedData, id: string): FeedData {
  return { ...data, pages: data.pages.map((page) => withoutItem(page, id)) };
}

function replaceInFeed(data: FeedData, updated: TTransaction): FeedData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === updated.id ? updated : item)),
    })),
  };
}

export function patchInFeed(data: FeedData, updated: TTransaction, filters: TransactionFilters): FeedData {
  if (!matchesFilters(updated, filters)) return removeFromFeed(data, updated.id);
  const current = findInFeed(data, updated.id);
  if (current?.transactionDate !== updated.transactionDate) return insertIntoFeed(data, updated);
  return replaceInFeed(data, updated);
}

export function findInFeed(data: FeedData | undefined, id: string) {
  for (const page of data?.pages ?? []) {
    const found = page.items.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

export function applyToSummary(
  summary: TransactionSummary,
  tx: TTransaction,
  sign: 1 | -1,
): TransactionSummary {
  const amount = tx.amount * sign;
  const previous = summary.byCategory[tx.categoryId] ?? { expense: 0, income: 0 };
  const expense = tx.type === "expense" ? amount : 0;
  const income = tx.type === "expense" ? 0 : amount;

  return {
    count: summary.count + sign,
    expenseTotal: summary.expenseTotal + expense,
    incomeTotal: summary.incomeTotal + income,
    byCategory: {
      ...summary.byCategory,
      [tx.categoryId]: {
        expense: previous.expense + expense,
        income: previous.income + income,
      },
    },
  };
}
