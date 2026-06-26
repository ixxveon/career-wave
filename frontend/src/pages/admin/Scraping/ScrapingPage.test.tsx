/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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

    renderPage();

    const runButton = await screen.findByRole('button', { name: '실행' });
    const retryButton = await screen.findByRole('button', { name: '재시도' });
    const testButton = await screen.findByRole('button', { name: '테스트' });
    const stopButton = await screen.findByRole('button', { name: '중지' });

    expect(runButton).toBeDisabled();
    expect(retryButton).toBeDisabled();
    expect(testButton).toBeDisabled();
    expect(stopButton).toBeDisabled();
    expect(runButton).toHaveAttribute('title');
  });
});
