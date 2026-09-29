export const CHART_HEIGHT = 232;
export const BAR_MIN = 76;
export const IDLE_HEIGHT = 44;
const ROUNDING_NOISE = 0.005;

const toChartScale = (value: number, max: number) => Math.round((value / max) * CHART_HEIGHT);

export function barHeight(total: number, max: number) {
  const isIdle = Math.abs(total) < ROUNDING_NOISE || max <= 0;
  if (isIdle) return { idle: true, height: IDLE_HEIGHT };
  return { idle: false, height: Math.max(BAR_MIN, toChartScale(Math.abs(total), max)) };
}

export function budgetBarHeights(spent: number, budget: number, max: number) {
  const track = Math.max(BAR_MIN, toChartScale(budget, max));
  if (spent <= budget) return { track, fill: Math.round(track * (spent / budget)) };
  return { track, fill: Math.max(track, toChartScale(spent, max)) };
}
