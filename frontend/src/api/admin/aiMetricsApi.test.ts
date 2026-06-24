import { describe, expect, it, vi } from 'vitest';
import {
  AI_DOMAIN,
  AI_EVENT_SEVERITY,
  AI_HEALTH_STATUS,
  AI_USAGE_RISK_LEVEL,
  mapAiDomainUsage,
  mapAiHeavyUsers,
  mapAiMetricLogs,
  mapAiMetricSummary,
  mapAiTokenTrend,
} from './aiMetricsApi';

describe('aiMetricsApi usage DTO mapper', () => {
  it('maps Spring summary response to screen summary type', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T00:00:00.000Z'));

    expect(
      mapAiMetricSummary({
        totalRequests: 12,
        totalInputTokens: 1200,
        totalOutputTokens: 340,
        totalCost: '19.5',
        documentRequests: 8,
        interviewRequests: 4,
        activeModelId: 1,
        activeModelName: 'gpt-4o-mini',
      })
    ).toEqual({
      totalRequests: 12,
      successRequests: 12,
      failedRequests: 0,
      totalInputTokens: 1200,
      totalOutputTokens: 340,
      estimatedCost: 19.5,
      averageLatencyMs: 0,
      healthStatus: AI_HEALTH_STATUS.NORMAL,
      lastSyncedAt: '2026-06-24T00:00:00.000Z',
    });

    vi.useRealTimers();
  });

  it('maps Spring domain wrapper response to screen domain usage list', () => {
    expect(
      mapAiDomainUsage({
        document: {
          requestCount: 10,
          inputTokens: 20000,
          outputTokens: 5000,
          cost: '100.25',
        },
        interview: {
          requestCount: 3,
          inputTokens: 70000,
          outputTokens: 35000,
          cost: 300,
        },
      })
    ).toEqual([
      {
        domain: AI_DOMAIN.DOCUMENT,
        domainLabel: 'AI 서류 기능',
        requestCount: 10,
        successCount: 10,
        failureCount: 0,
        failureRate: 0,
        inputTokens: 20000,
        outputTokens: 5000,
        estimatedCost: 100.25,
        averageLatencyMs: 0,
        riskLevel: AI_USAGE_RISK_LEVEL.NORMAL,
        displayModelName: null,
        actualModelName: null,
      },
      {
        domain: AI_DOMAIN.INTERVIEW,
        domainLabel: 'AI 면접 기능',
        requestCount: 3,
        successCount: 3,
        failureCount: 0,
        failureRate: 0,
        inputTokens: 70000,
        outputTokens: 35000,
        estimatedCost: 300,
        averageLatencyMs: 0,
        riskLevel: AI_USAGE_RISK_LEVEL.CRITICAL,
        displayModelName: null,
        actualModelName: null,
      },
    ]);
  });

  it('maps Spring token trend wrapper response to screen point list', () => {
    expect(
      mapAiTokenTrend({
        interval: 'DAILY',
        points: [
          {
            bucket: '2026-06-24T00:00:00Z',
            inputTokens: 10,
            outputTokens: 20,
            cost: null,
          },
        ],
      })
    ).toEqual([
      {
        bucket: '2026-06-24T00:00:00Z',
        inputTokens: 10,
        outputTokens: 20,
        estimatedCost: null,
        requestCount: 0,
      },
    ]);
  });

  it('maps Spring heavy users wrapper response to screen heavy user list', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T01:00:00.000Z'));

    expect(
      mapAiHeavyUsers({
        users: [
          {
            memberId: '7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a',
            requestCount: 9,
            inputTokens: 60000,
            outputTokens: 12000,
            cost: '42',
          },
        ],
      })
    ).toEqual([
      {
        userId: '7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a',
        maskedUserLabel: 'USER-2f3a',
        domain: AI_DOMAIN.DOCUMENT,
        domainLabel: '전체 도메인',
        tokenUsage: 72000,
        requestCount: 9,
        riskLevel: AI_USAGE_RISK_LEVEL.WARNING,
        lastUsedAt: '2026-06-24T01:00:00.000Z',
      },
    ]);

    vi.useRealTimers();
  });

  it('maps Spring usage log page response to screen log page type', () => {
    expect(
      mapAiMetricLogs({
        content: [
          {
            aiUsageLogId: 101,
            memberId: '7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a',
            sessionId: null,
            aiModelId: 3,
            featureType: AI_DOMAIN.INTERVIEW,
            inputTokens: 120,
            outputTokens: 45,
            cost: '2.5',
            createdAt: '2026-06-24T02:00:00Z',
          },
        ],
        page: 1,
        size: 5,
        totalElements: 1,
        totalPages: 1,
      })
    ).toEqual({
      content: [
        {
          eventId: 101,
          occurredAt: '2026-06-24T02:00:00Z',
          domain: AI_DOMAIN.INTERVIEW,
          domainLabel: 'AI 면접 기능',
          severity: AI_EVENT_SEVERITY.INFO,
          message: 'AI usage recorded. inputTokens=120, outputTokens=45, cost=2.5',
          displayModelName: null,
          actualModelName: '3',
        },
      ],
      page: 1,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });
  });
});
