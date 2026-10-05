import { barHeight, budgetBarHeights } from "./chart";
import type { CategoryTotal } from "../types";
import { visibleSize } from "./strip-data";

interface BarLayout {
  isIdle: boolean;
  height: number;
  fill: number;
  track: number | null;
}

export function stripScaleMax(data: CategoryTotal[]) {
  return Math.max(0, ...data.map(visibleSize));
}

export function barLayout({ total, budget }: CategoryTotal, max: number): BarLayout {
  if (budget === null) {
    const { isIdle, height } = barHeight(total, max);
    return { isIdle, height, fill: height, track: null };
  }
  const { track, fill } = budgetBarHeights(Math.abs(total), budget, max);
  return { isIdle: false, height: Math.max(track, fill), fill, track };
}

export function isOverBudget({ total, budget }: CategoryTotal) {
  return budget !== null && Math.abs(total) > budget;
}
