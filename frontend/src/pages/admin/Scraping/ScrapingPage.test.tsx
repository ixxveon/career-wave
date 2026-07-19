/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScrapingPage from './ScrapingPage';

const scrapingApiMock = vi.hoisted(() => ({
  getSources: vi.fn(),
  requestAction: vi.fn(),
}));

const auditLogApiMock = vi.hoisted(() => ({
  getLogs: vi.fn(),
}));

vi.mock('../../../api/admin/scrapingApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin/scrapingApi')>(
    '../../../api/admin/scrapingApi',
  );

  return {
    ...actual,
    scrapingApi: scrapingApiMock,
  };
});

vi.mock('../../../api/admin/auditLogApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin/auditLogApi')>(
    '../../../api/admin/auditLogApi',
  );

  return {
    ...actual,
    auditLogApi: auditLogApiMock,
  };
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ScrapingPage />
    </QueryClientProvider>,
  );
}

function apiResponse<T>(data: T) {
  return {
    data: {
      success: true,
      message: 'OK',
      data,
    },
  };
}

describe('ScrapingPage action guards', () => {
  it('disables run, retry, and test actions for disabled pipelines', async () => {
    scrapingApiMock.getSources.mockResolvedValue(
      apiResponse({
        content: [
          {
            sourceName: 'wanted',
            status: 'FAILED',
            isEnabled: false,
            successRate: 0,
            averageDurationMs: 0,
            cycleExpression: '-',
            collectedCount: 0,
            recentErrorCode: null,
            recentErrorMessage: null,
            live: false,
            lastStartedAt: null,
            lastFinishedAt: null,
            updatedAt: '2026-06-26T00:00:00+09:00',
          },
        ],
        page: 1,
        size: 5,
        totalElements: 1,
        totalPages: 1,
      }),
    );
    auditLogApiMock.getLogs.mockResolvedValue(
      apiResponse({
        content: [],
        page: 1,
        size: 5,
        totalElements: 0,
        totalPages: 1,
      }),
    );

    const { container } = renderPage();

    await waitFor(() => expect(scrapingApiMock.getSources).toHaveBeenCalled());
    await waitFor(() =>
      expect(auditLogApiMock.getLogs).toHaveBeenCalledWith({
        logType: 'SCRAPING_SYSTEM',
        keyword: undefined,
        page: 1,
        size: 5,
      }),
    );
    await waitFor(() =>
      expect(container.querySelectorAll<HTMLButtonElement>('.scrapeOpsActionGroup button')).toHaveLength(4),
    );

    const actionButtons = container.querySelectorAll<HTMLButtonElement>('.scrapeOpsActionGroup button');

    expect(actionButtons).toHaveLength(4);
    expect(actionButtons[0].disabled).toBe(true);
    expect(actionButtons[1].disabled).toBe(true);
    expect(actionButtons[2].disabled).toBe(true);
    expect(actionButtons[0].getAttribute('title')).toBeTruthy();
    expect(screen.getByText('발생 시각')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: '로그 페이지 이동' })).toBeNull();
  });
});
