/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogPage from './AuditLogPage';

const auditLogApiMock = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getLogs: vi.fn(),
  getLogDetail: vi.fn(),
}));

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
      <AuditLogPage />
    </QueryClientProvider>,
  );
}

function seedSummary() {
  auditLogApiMock.getSummary.mockResolvedValue({
    data: {
      success: true,
      data: {
        totalCount: 1,
        adminCount: 1,
        aiCount: 0,
        scrapingCount: 0,
        warningCount: 0,
        errorCount: 0,
        lastSyncedAt: '',
      },
    },
  });
}

const listItem = {
  id: '1001',
  logType: 'ADMIN_ACTIVITY',
  logTypeLabel: '관리자 관리',
  severity: 'INFO',
  summary: 'UPDATE_ADMIN_ROLE',
  detailSummary: '관리자 역할 변경 요청',
  actorId: 'ADM-1',
  targetType: 'ADMIN',
  targetId: 'ADM-2',
  ipAddressMasked: '10.20.**.**',
  occurredAt: '2026-06-26 10:30:00',
};

const detailItem = {
  ...listItem,
  summary: '관리자 계정 수정 완료',
  detailSummary: 'MASTER 관리자가 BACKEND 관리자의 역할을 CS로 변경했습니다.',
};

function resolveLogList(content = [listItem]) {
  auditLogApiMock.getLogs.mockResolvedValue({
    data: {
      success: true,
      data: {
        content,
        page: 1,
        size: 20,
        totalElements: content.length,
        totalPages: content.length > 0 ? 1 : 0,
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  seedSummary();
  resolveLogList();
  auditLogApiMock.getLogDetail.mockResolvedValue({
    data: {
      success: true,
      data: detailItem,
    },
  });
});

afterEach(() => {
  cleanup();
});

describe('AuditLogPage API state integration', () => {
  it('selects the first log and renders detail response fields without request id', async () => {
    renderPage();

    expect(await screen.findByText('[관리자 관리] UPDATE_ADMIN_ROLE')).toBeTruthy();
    await waitFor(() => expect(auditLogApiMock.getLogDetail).toHaveBeenCalledWith('1001'));

    expect(await screen.findByText('관리자 계정 수정 완료')).toBeTruthy();
    expect(screen.getByText('MASTER 관리자가 BACKEND 관리자의 역할을 CS로 변경했습니다.')).toBeTruthy();
    expect(screen.getByText('ADM-1')).toBeTruthy();
    expect(screen.getByText('ADMIN:ADM-2')).toBeTruthy();
    expect(screen.getByText('10.20.**.**')).toBeTruthy();
    expect(screen.queryByText('REQUEST')).toBeNull();
  });

  it('clears selection and keeps detail API disabled when the list is empty', async () => {
    resolveLogList([]);

    renderPage();

    expect(await screen.findByText('조건에 맞는 감사 로그가 없습니다.')).toBeTruthy();
    expect(screen.getByText('표시할 로그가 없습니다.')).toBeTruthy();
    expect(auditLogApiMock.getLogDetail).not.toHaveBeenCalled();
  });

  it('shows list error state and retries list fetch', async () => {
    auditLogApiMock.getLogs.mockReset();
    auditLogApiMock.getLogs
      .mockRejectedValueOnce(new Error('list error'))
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            content: [],
            page: 1,
            size: 20,
            totalElements: 0,
            totalPages: 0,
          },
        },
      });

    renderPage();

    expect(await screen.findByText('감사 로그 조회에 실패했습니다.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));

    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('조건에 맞는 감사 로그가 없습니다.')).toBeTruthy();
  });

  it('shows detail error state and retries detail fetch for the selected log', async () => {
    auditLogApiMock.getLogDetail
      .mockRejectedValueOnce(new Error('detail error'))
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: detailItem,
        },
      });

    renderPage();

    expect(await screen.findByText('상세 정보를 불러오지 못했습니다.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));

    await waitFor(() => expect(auditLogApiMock.getLogDetail).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('관리자 계정 수정 완료')).toBeTruthy();
  });
});
