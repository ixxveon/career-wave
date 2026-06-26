/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScrapingPage from './ScrapingPage';

const scrapingApiMock = vi.hoisted(() => ({
  getSources: vi.fn(),
  getLogs: vi.fn(),
  requestAction: vi.fn(),
}));

vi.mock('../../../api/admin/scrapingApi', () => ({
  PIPELINE_STATUS: {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
  },
  SCRAPING_STATUS: {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
  },
  SCRAPING_ACTION_TYPE: {
    RUN: 'RUN',
    RETRY: 'RETRY',
    TEST: 'TEST',
  },
  scrapingApi: scrapingApiMock,
}));

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

describe('ScrapingPage action guards', () => {
  it('disables run, retry, and test actions for disabled pipelines', async () => {
    scrapingApiMock.getSources.mockResolvedValueOnce({
      data: {
        data: {
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
        },
      },
    });
    scrapingApiMock.getLogs.mockResolvedValueOnce({
      data: {
        data: {
          content: [],
          page: 1,
          size: 5,
          totalElements: 0,
          totalPages: 1,
        },
      },
    });

    const { container, findByText } = renderPage();

    await waitFor(() => expect(scrapingApiMock.getSources).toHaveBeenCalled());
    await findByText('wanted');

    const actionButtons = container.querySelectorAll<HTMLButtonElement>('.scrapeOpsActionGroup button');

    expect(actionButtons).toHaveLength(4);
    expect(actionButtons[0].disabled).toBe(true);
    expect(actionButtons[1].disabled).toBe(true);
    expect(actionButtons[2].disabled).toBe(true);
    expect(actionButtons[0].getAttribute('title')).toBeTruthy();
  });
});
