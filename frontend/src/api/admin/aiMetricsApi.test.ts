import { describe, expect, it, vi } from "vitest";
import {
  AI_DOMAIN,
  AI_EVENT_SEVERITY,
  AI_HEALTH_STATUS,
  AI_USAGE_RISK_LEVEL,
  RAG_INDEX_STATUS,
  mapAiBudgetSetting,
  mapAiDomainUsage,
  mapAiHeavyUsers,
  mapAiMetricLogs,
  mapAiMetricSummary,
  mapAiTokenTrend,
  mapRagDocumentDownload,
  mapRagDocumentList,
  mapRagDocumentMetric,
  mapRagDocumentStatus,
  toUpdateAiBudgetRequestRaw,
  toUpdateAiDiscordAlertRequestRaw,
  toUpdateAiRateLimitRequestRaw,
} from "./aiMetricsApi";

describe("aiMetricsApi usage DTO mapper", () => {
  it("maps Spring summary response to screen summary type", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T00:00:00.000Z"));

    try {
      expect(
        mapAiMetricSummary({
          totalRequests: 12,
          totalInputTokens: 1200,
          totalOutputTokens: 340,
          totalCost: "19.5",
          documentRequests: 8,
          interviewRequests: 4,
          activeModelId: 1,
          activeModelName: "gpt-4o-mini",
        }),
      ).toEqual({
        totalRequests: 12,
        successRequests: 12,
        failedRequests: 0,
        totalInputTokens: 1200,
        totalOutputTokens: 340,
        estimatedCost: 19.5,
        averageLatencyMs: 0,
        healthStatus: AI_HEALTH_STATUS.NORMAL,
        lastSyncedAt: "2026-06-24T00:00:00.000Z",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps Spring domain wrapper response to screen domain usage list", () => {
    expect(
      mapAiDomainUsage({
        document: {
          requestCount: 10,
          inputTokens: 20000,
          outputTokens: 5000,
          cost: "100.25",
        },
        interview: {
          requestCount: 3,
          inputTokens: 70000,
          outputTokens: 35000,
          cost: 300,
        },
      }),
    ).toEqual([
      {
        domain: AI_DOMAIN.DOCUMENT,
        domainLabel: "AI 서류 기능",
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
        domainLabel: "AI 면접 기능",
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

  it("maps Spring token trend wrapper response to screen point list", () => {
    expect(
      mapAiTokenTrend({
        interval: "DAILY",
        points: [
          {
            bucket: "2026-06-24T00:00:00Z",
            inputTokens: 10,
            outputTokens: 20,
            cost: null,
          },
        ],
      }),
    ).toEqual([
      {
        bucket: "2026-06-24T00:00:00Z",
        inputTokens: 10,
        outputTokens: 20,
        estimatedCost: null,
        requestCount: 0,
      },
    ]);
  });

  it("maps Spring heavy users wrapper response to screen heavy user list", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T01:00:00.000Z"));

    try {
      expect(
        mapAiHeavyUsers({
          users: [
            {
              memberId: "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
              requestCount: 9,
              inputTokens: 60000,
              outputTokens: 12000,
              cost: "42",
            },
          ],
        }),
      ).toEqual([
        {
          userId: "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
          maskedUserLabel: "USER-2f3a",
          domain: AI_DOMAIN.DOCUMENT,
          domainLabel: "전체 도메인",
          tokenUsage: 72000,
          requestCount: 9,
          riskLevel: AI_USAGE_RISK_LEVEL.WARNING,
          lastUsedAt: "2026-06-24T01:00:00.000Z",
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps heavy users with the requested domain metadata", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T01:00:00.000Z"));

    try {
      expect(
        mapAiHeavyUsers(
          {
            users: [
              {
                memberId: "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
                requestCount: 9,
                inputTokens: 60000,
                outputTokens: 12000,
                cost: "42",
              },
            ],
          },
          AI_DOMAIN.INTERVIEW,
        ),
      ).toEqual([
        {
          userId: "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
          maskedUserLabel: "USER-2f3a",
          domain: AI_DOMAIN.INTERVIEW,
          domainLabel: "AI 면접 기능",
          tokenUsage: 72000,
          requestCount: 9,
          riskLevel: AI_USAGE_RISK_LEVEL.WARNING,
          lastUsedAt: "2026-06-24T01:00:00.000Z",
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps Spring usage log page response to screen log page type", () => {
    expect(
      mapAiMetricLogs({
        content: [
          {
            aiUsageLogId: 101,
            memberId: "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
            sessionId: null,
            aiModelId: 3,
            featureType: AI_DOMAIN.INTERVIEW,
            inputTokens: 120,
            outputTokens: 45,
            cost: "2.5",
            createdAt: "2026-06-24T02:00:00Z",
          },
        ],
        page: 1,
        size: 5,
        totalElements: 1,
        totalPages: 1,
      }),
    ).toEqual({
      content: [
        {
          eventId: 101,
          occurredAt: "2026-06-24T02:00:00Z",
          domain: AI_DOMAIN.INTERVIEW,
          domainLabel: "AI 면접 기능",
          severity: AI_EVENT_SEVERITY.INFO,
          message:
            "AI usage recorded. inputTokens=120, outputTokens=45, cost=2.5",
          displayModelName: null,
          actualModelName: "3",
        },
      ],
      page: 1,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });
  });
});

describe("aiMetricsApi budget contract mapper", () => {
  const rawBudget = {
    aiOpsSettingId: 1,
    selectedModelId: 7,
    monthlyBudget: "3500000",
    alertEnabled: true,
    alertChannel: "DISCORD",
    alertThreshold: 85,
    rateLimitEnabled: false,
    updatedAt: "2026-06-24T00:00:00Z",
  };

  it("maps Spring budget response to screen budget setting", () => {
    expect(mapAiBudgetSetting(rawBudget)).toEqual({
      selectedModelId: 7,
      monthlyBudget: 3500000,
      currentSpend: null,
      forecastSpend: null,
      thresholdPercent: 85,
      discordAlertEnabled: true,
      rateLimitEnabled: false,
    });
  });

  it("maps screen budget update request to Spring request fields", () => {
    expect(
      toUpdateAiBudgetRequestRaw(
        {
          monthlyBudget: 4000000,
          thresholdPercent: 90,
        },
        mapAiBudgetSetting(rawBudget),
      ),
    ).toEqual({
      selectedModelId: 7,
      monthlyBudget: 4000000,
      alertThreshold: 90,
    });
  });

  it("prefers explicit selected model id when updating budget", () => {
    expect(
      toUpdateAiBudgetRequestRaw(
        {
          selectedModelId: 11,
          monthlyBudget: 4000000,
          thresholdPercent: 90,
        },
        mapAiBudgetSetting(rawBudget),
      ),
    ).toEqual({
      selectedModelId: 11,
      monthlyBudget: 4000000,
      alertThreshold: 90,
    });
  });

  it("maps alert and rate limit toggle requests to Spring request fields", () => {
    expect(toUpdateAiDiscordAlertRequestRaw({ enabled: false })).toEqual({
      alertEnabled: false,
    });
    expect(
      toUpdateAiRateLimitRequestRaw({
        enabled: true,
        reason: "budget exceeded",
      }),
    ).toEqual({
      rateLimitEnabled: true,
    });
  });
});

describe("aiMetricsApi RAG document contract mapper", () => {
  const rawDocument = {
    ragDocumentId: 10,
    uploadedBy: 1,
    fileUuid: "1fb3e31e-fd5a-420d-8135-ec682ac53956",
    originalFileName: "faq.pdf",
    mimeType: "application/pdf",
    fileSize: 182030,
    chunkCount: 24,
    indexingProgress: 75,
    status: "INDEXING" as const,
    createdAt: "2026-06-24T00:00:00Z",
    updatedAt: "2026-06-24T00:10:00Z",
  };

  it("maps Spring RAG document status to screen status", () => {
    expect(mapRagDocumentStatus("UPLOADED")).toBe(RAG_INDEX_STATUS.SYNCED);
    expect(mapRagDocumentStatus("COMPLETED")).toBe(RAG_INDEX_STATUS.SYNCED);
    expect(mapRagDocumentStatus("INDEXING")).toBe(RAG_INDEX_STATUS.INDEXING);
    expect(mapRagDocumentStatus("FAILED")).toBe(RAG_INDEX_STATUS.FAILED);
  });

  it("maps Spring RAG document item to screen document metric", () => {
    expect(mapRagDocumentMetric(rawDocument)).toEqual({
      documentId: "10",
      name: "faq.pdf",
      chunkCount: 24,
      progressPercent: 75,
      status: RAG_INDEX_STATUS.INDEXING,
      updatedAt: "2026-06-24T00:10:00Z",
    });
  });

  it("maps Spring RAG document page wrapper to screen document list", () => {
    expect(
      mapRagDocumentList({
        content: [rawDocument],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    ).toEqual([
      {
        documentId: "10",
        name: "faq.pdf",
        chunkCount: 24,
        progressPercent: 75,
        status: RAG_INDEX_STATUS.INDEXING,
        updatedAt: "2026-06-24T00:10:00Z",
      },
    ]);
  });

  it("maps Spring RAG download info to screen download info", () => {
    expect(
      mapRagDocumentDownload({
        ragDocumentId: 10,
        originalFileName: "faq.pdf",
        fileUuid: "1fb3e31e-fd5a-420d-8135-ec682ac53956",
        mimeType: "application/pdf",
        fileSize: 182030,
        downloadUrl: "/api/v1/admin/ai-metrics/rag-documents/10/download",
      }),
    ).toEqual({
      documentId: "10",
      name: "faq.pdf",
      downloadUrl: "/api/v1/admin/ai-metrics/rag-documents/10/download",
    });
  });
});
