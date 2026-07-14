export const TOKEN_CHART_TICK_INTERVALS = 6;

export interface TokenChartAxis {
  max: number;
  ticks: number[];
  gridStepPercent: number;
}

function calculateNiceStep(rawStep: number): number {
  if (rawStep <= 1) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const multiplier = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

export function createTokenChartAxis(values: number[]): TokenChartAxis {
  const maxValue = Math.max(0, ...values.filter(Number.isFinite));
  const step = calculateNiceStep(maxValue / TOKEN_CHART_TICK_INTERVALS);
  const max = step * TOKEN_CHART_TICK_INTERVALS;
  const ticks = Array.from(
    { length: TOKEN_CHART_TICK_INTERVALS + 1 },
    (_, index) => max - step * index
  );

  return {
    max,
    ticks,
    gridStepPercent: 100 / TOKEN_CHART_TICK_INTERVALS,
  };
}

export function getTokenBarHeight(value: number, axisMax: number): number {
  if (!Number.isFinite(value) || value <= 0 || axisMax <= 0) return 0;
  return Math.min(100, (value / axisMax) * 100);
}
