import { signedAmount } from "./format";
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
  const groups: DayGroup[] = [];
  const indexByDate = new Map<string, number>();

  for (const tx of transactions) {
    const groupIndex = indexByDate.get(tx.transactionDate);
    if (groupIndex === undefined) {
      indexByDate.set(tx.transactionDate, groups.length);
      groups.push({ date: tx.transactionDate, items: [tx] });
    } else {
      groups[groupIndex].items.push(tx);
    }
  }

  return groups;
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
  return tx.description || category?.name || fallbackName;
}
