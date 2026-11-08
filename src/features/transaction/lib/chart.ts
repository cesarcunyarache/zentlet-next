export const CHART_HEIGHT = 264;
export const BAR_MIN = 76;
export const IDLE_HEIGHT = 44;
export const BUDGET_GAP_MIN = 14;
const ROUNDING_NOISE = 0.005;

const toChartScale = (value: number, max: number) =>
  Math.round((value / max) * CHART_HEIGHT);

export function barHeight(total: number, max: number) {
  const isIdle = Math.abs(total) < ROUNDING_NOISE || max <= 0;
  if (isIdle) return { isIdle, height: IDLE_HEIGHT };
  return {
    isIdle,
    height: Math.max(BAR_MIN, toChartScale(Math.abs(total), max)),
  };
}

export function budgetBarHeights(spent: number, budget: number, max: number) {
  if (spent < ROUNDING_NOISE)
    return { track: Math.max(BAR_MIN, toChartScale(budget, max)), fill: 0 };

  const spentHeight = Math.max(BAR_MIN, toChartScale(spent, max));
  if (spent > budget) {
    const proportional = Math.round((spentHeight * budget) / spent);
    const track = Math.min(
      spentHeight - BUDGET_GAP_MIN,
      Math.max(IDLE_HEIGHT, proportional),
    );
    return { track, fill: spentHeight };
  }

  const roomAbove = spent < budget ? BUDGET_GAP_MIN : 0;
  const track = Math.min(
    CHART_HEIGHT,
    Math.max(toChartScale(budget, max), spentHeight + roomAbove),
  );
  return { track, fill: spentHeight };
}
