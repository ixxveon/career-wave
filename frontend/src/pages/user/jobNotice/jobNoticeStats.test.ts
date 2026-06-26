import { describe, expect, it } from 'vitest';
import { createBannerStats } from './jobNoticeStats';

describe('createBannerStats', () => {
  it('renders nullable todayNewDelta safely with zero fallback', () => {
    const stats = createBannerStats({
      totalOpenCount: 120,
      todayNewCount: 8,
      todayNewDelta: null,
      todayNewRate: 6.7,
    });

    expect(stats[0].value).toBe('120');
    expect(stats[0].description).toBe('+8 오늘');
    expect(stats[1].value).toBe('8');
    expect(stats[1].description).toBe('(6.7%)');
    expect(stats[1].highlight).toBe('+0');
  });

  it('preserves numeric todayNewDelta when provided', () => {
    const stats = createBannerStats({
      totalOpenCount: 1200,
      todayNewCount: 12,
      todayNewDelta: 3,
      todayNewRate: 1.5,
    });

    expect(stats[0].value).toBe('1,200');
    expect(stats[1].highlight).toBe('+3');
  });
});
