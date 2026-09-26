import type { InfiniteData } from "@tanstack/react-query";
import type {
  DateRange,
  TTransaction,
  TransactionFilters,
  TransactionPage,
  TransactionSummary,
} from "../types";

/*
 * Cambios locales sobre lo que ya está en cache (páginas del feed y
 * resúmenes), para que una alta o un borrado se vean al instante —también
 * sin conexión— sin volver a pedir todo al servidor.
 */

export type FeedData = InfiniteData<TransactionPage, string | null>;

export function inRange(date: string, { from, to }: DateRange) {
  return (!from || date >= from) && (!to || date < to);
}

/** La búsqueda por nombre de categoría sólo la resuelve el servidor; aquí basta la descripción. */
export function matchesFilters(tx: TTransaction, filters: TransactionFilters) {
  if (!inRange(tx.transactionDate, filters)) return false;
  if (filters.type && tx.type !== filters.type) return false;
  if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
  if (filters.q && !tx.description.toLowerCase().includes(filters.q.toLowerCase())) return false;
  return true;
}

/**
 * Inserta en su sitio por fecha (lo recién creado va primero dentro de su
 * día). Si cae más allá de lo cargado y quedan páginas, llegará al paginar.
 */
export function insertIntoFeed(data: FeedData, tx: TTransaction): FeedData {
  const pages = data.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== tx.id) }));

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
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== id) })),
  };
}

/**
 * Aplica una edición: sale de la lista si deja de cumplir el filtro, entra
 * si ahora lo cumple (p. ej. cambió a la categoría filtrada) y se recoloca
 * si cambió de fecha.
 */
export function patchInFeed(data: FeedData, updated: TTransaction, filters: TransactionFilters): FeedData {
  if (!matchesFilters(updated, filters)) return removeFromFeed(data, updated.id);
  const current = findInFeed(data, updated.id);
  if (current?.transactionDate !== updated.transactionDate) return insertIntoFeed(data, updated);
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === updated.id ? updated : item)),
    })),
  };
}

export function findInFeed(data: FeedData | undefined, id: string) {
  for (const page of data?.pages ?? []) {
    const found = page.items.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Suma (`sign = 1`) o resta (`-1`) un movimiento de un resumen. */
export function applyToSummary(
  summary: TransactionSummary,
  tx: TTransaction,
  sign: 1 | -1,
): TransactionSummary {
  const amount = tx.amount * sign;
  const previous = summary.byCategory[tx.categoryId] ?? { expense: 0, income: 0 };
  const isExpense = tx.type === "expense";

  return {
    count: summary.count + sign,
    expenseTotal: summary.expenseTotal + (isExpense ? amount : 0),
    incomeTotal: summary.incomeTotal + (isExpense ? 0 : amount),
    byCategory: {
      ...summary.byCategory,
      [tx.categoryId]: {
        expense: previous.expense + (isExpense ? amount : 0),
        income: previous.income + (isExpense ? 0 : amount),
      },
    },
  };
}
