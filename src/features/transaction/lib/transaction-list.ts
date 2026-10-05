import { describeOrFallback, signedAmount } from "./format";
import type { CategoryLike, TTransaction } from "../types";

const STAGGERED_ROWS = 8;
const STAGGER_STEP_SECONDS = 0.03;

export interface DayGroup {
  date: string;
  items: TTransaction[];
}

export function dayTotal(items: TTransaction[]) {
  return items.reduce((sum, tx) => sum + signedAmount(tx), 0);
}

export function groupByDay(transactions: TTransaction[]): DayGroup[] {
  const groupsByDate = new Map<string, DayGroup>();
  for (const tx of transactions) {
    const group = groupsByDate.get(tx.transactionDate);
    if (group) group.items.push(tx);
    else groupsByDate.set(tx.transactionDate, { date: tx.transactionDate, items: [tx] });
  }
  return [...groupsByDate.values()];
}

export function groupStartIndexes(groups: DayGroup[]) {
  let next = 0;
  return groups.map(({ items }) => {
    const start = next;
    next += items.length;
    return start;
  });
}

export function rowEnterDelay(rowIndex: number) {
  return Math.min(rowIndex, STAGGERED_ROWS) * STAGGER_STEP_SECONDS;
}

export function transactionName(tx: TTransaction, category: CategoryLike | undefined, fallbackName: string) {
  return describeOrFallback(tx.description, category?.name, fallbackName);
}
