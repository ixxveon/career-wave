import { describe, expect, it } from 'vitest';
import { formatCost } from './aiMetricsPageUtils';

describe('formatCost', () => {
  it('preserves sub-cent USD values used by AI usage logs', () => {
    expect(formatCost(0.0012)).toBe('$0.0012');
  });
});
