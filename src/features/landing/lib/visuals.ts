export function splitInHalf<T>(items: readonly T[]): [T[], T[]] {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}

interface TickerStat {
  value: number;
  from?: number;
}

export interface TickerRange {
  value: number;
  startValue: number;
  direction: "up" | "down";
}

export function getTickerRange({ value, from = 0 }: TickerStat): TickerRange {
  const isCountingDown = from > value;
  if (isCountingDown) return { value: from, startValue: value, direction: "down" };
  return { value, startValue: from, direction: "up" };
}

export function getBudgetStatus({ spent, budget }: { spent: number; budget: number }) {
  return {
    isOver: spent > budget,
    rest: Math.abs(budget - spent),
    ratio: Math.min(spent / budget, 1),
  };
}

interface DonutSlice {
  name: string;
  color: string;
  total: number;
}

export interface DonutArc {
  key: string;
  color: string;
  length: number;
  offset: number;
}

export function buildDonutArcs(slices: readonly DonutSlice[], circumference: number): DonutArc[] {
  const total = slices.reduce((sum, slice) => sum + slice.total, 0);
  let offset = 0;

  return slices.map((slice) => {
    const length = (slice.total / total) * circumference;
    const arc = { key: slice.name, color: slice.color, length, offset };
    offset += length;
    return arc;
  });
}

const MAX_INITIALS = 2;

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, MAX_INITIALS)
    .join("");
}
