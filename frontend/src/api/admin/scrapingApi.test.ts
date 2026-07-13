import { describe, expect, it } from 'vitest';
import {
  PIPELINE_STATUS,
  formatScheduleInterval,
  toScrapingSource,
  toScrapingSourceDetail,
  type BackendScrapingPipelineItem,
} from './scrapingApi';

const backendPipelineItem: BackendScrapingPipelineItem = {
  scrapingPipelineId: 1,
  sourceName: 'wanted',
  displayName: 'Wanted',
  pipelineStatus: PIPELINE_STATUS.RUNNING,
  isEnabled: true,
  scheduleIntervalMinutes: 360,
  lastStartedAt: '2026-06-22T09:00:00+09:00',
  lastSuccessAt: '2026-06-21T09:10:00+09:00',
  lastFailedAt: null,
  lastDurationMs: 1234,
  lastTotalCount: 56,
  lastErrorMessage: null,
  createdAt: '2026-06-20T09:00:00+09:00',
  updatedAt: '2026-06-22T09:05:00+09:00',
};

describe('scrapingApi pipeline mapper', () => {
  it('normalizes Spring pipeline item fields to the frontend source type', () => {
    expect(toScrapingSource(backendPipelineItem)).toEqual({
      sourceName: 'wanted',
      status: PIPELINE_STATUS.RUNNING,
      isEnabled: true,
      scheduleIntervalMinutes: 360,
      successRate: 0,
      averageDurationMs: 1234,
      cycleExpression: '6\uC2DC\uAC04',
      collectedCount: 56,
      recentErrorCode: null,
      recentErrorMessage: null,
      live: true,
      lastStartedAt: '2026-06-22T09:00:00+09:00',
      lastFinishedAt: '2026-06-21T09:10:00+09:00',
      updatedAt: '2026-06-22T09:05:00+09:00',
    });
  });

  it('falls back safely when nullable backend metrics are missing', () => {
    const source = toScrapingSource({
      ...backendPipelineItem,
      pipelineStatus: PIPELINE_STATUS.FAILED,
      lastSuccessAt: null,
      lastFailedAt: '2026-06-22T09:15:00+09:00',
      lastDurationMs: null,
      lastTotalCount: null,
      lastErrorMessage: 'network timeout',
    });

    expect(source.averageDurationMs).toBe(0);
    expect(source.collectedCount).toBe(0);
    expect(source.isEnabled).toBe(true);
    expect(source.recentErrorCode).toBeNull();
    expect(source.recentErrorMessage).toBe('network timeout');
    expect(source.live).toBe(false);
    expect(source.lastFinishedAt).toBe('2026-06-22T09:15:00+09:00');
  });

  it('normalizes Spring pipeline detail fields without list-only metadata', () => {
    expect(toScrapingSourceDetail(backendPipelineItem)).toEqual({
      sourceName: 'wanted',
      status: PIPELINE_STATUS.RUNNING,
      isEnabled: true,
      scheduleIntervalMinutes: 360,
      successRate: 0,
      averageDurationMs: 1234,
      cycleExpression: '6\uC2DC\uAC04',
      collectedCount: 56,
      recentErrorCode: null,
      recentErrorMessage: null,
      lastStartedAt: '2026-06-22T09:00:00+09:00',
      lastFinishedAt: '2026-06-21T09:10:00+09:00',
      lastRunId: null,
    });
  });

  it('preserves disabled state for the page action guards', () => {
    const source = toScrapingSource({
      ...backendPipelineItem,
      isEnabled: false,
      pipelineStatus: PIPELINE_STATUS.SUCCESS,
    });

    expect(source.isEnabled).toBe(false);
  });

  it.each([
    [10, '10\uBD84'],
    [360, '6\uC2DC\uAC04'],
    [720, '12\uC2DC\uAC04'],
    [90, '1\uC2DC\uAC04 30\uBD84'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatScheduleInterval(minutes)).toBe(expected);
  });
});
