import { describe, expect, it } from 'vitest';
import { createTokenChartAxis, getTokenBarHeight } from './aiMetricsChartUtils';

describe('createTokenChartAxis', () => {
  it.each([
    { value: 0, max: 6, ticks: [6, 5, 4, 3, 2, 1, 0] },
    { value: 87, max: 120, ticks: [120, 100, 80, 60, 40, 20, 0] },
    { value: 999, max: 1200, ticks: [1200, 1000, 800, 600, 400, 200, 0] },
    { value: 1001, max: 1200, ticks: [1200, 1000, 800, 600, 400, 200, 0] },
  ])('creates readable ticks for $value', ({ value, max, ticks }) => {
    const axis = createTokenChartAxis([value]);

    expect(axis.max).toBe(max);
    expect(axis.ticks).toEqual(ticks);
    expect(axis.gridStepPercent).toBeCloseTo(100 / 6);
  });
});

describe('getTokenBarHeight', () => {
  it('keeps a bar height within the axis scale', () => {
    expect(getTokenBarHeight(300, 1200)).toBe(25);
    expect(getTokenBarHeight(1800, 1200)).toBe(100);
    expect(getTokenBarHeight(0, 1200)).toBe(0);
  });
});
