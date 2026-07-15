/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogPage from './AuditLogPage';

const auditLogApiMock = vi.hoisted(() => ({
  getLogs: vi.fn(),
  getLogDetail: vi.fn(),
}));

vi.mock('../../../api/admin/auditLogApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin/auditLogApi')>('../../../api/admin/auditLogApi');
  return { ...actual, auditLogApi: auditLogApiMock };
});

const listItem = {
  id: '1001',
  logType: 'ADMIN_ACTIVITY' as const,
  logTypeLabel: '관리자 활동',
  severity: 'INFO' as const,
  summary: '회원 상세 조회',
  detailSummary: 'admin-1 관리자가 회원 상세 정보를 조회했습니다.',
  actorId: 'admin-1',
  targetType: 'MEMBER',
  targetId: '1842',
  ipAddressMasked: '10.20.30.*',
  occurredAt: '2026-07-10 17:27:56',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AuditLogPage /></QueryClientProvider>);
}

function resolveList(content = [listItem], page = 1, totalPages = 1) {
  auditLogApiMock.getLogs.mockResolvedValue({
    data: { success: true, data: { content, page, size: 9, totalElements: 1248, totalPages } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveList();
  auditLogApiMock.getLogDetail.mockResolvedValue({ data: { success: true, data: listItem } });
});

afterEach(cleanup);

describe('AuditLogPage', () => {
  it('renders the operational table and selected log detail', async () => {
    renderPage();

    expect(await screen.findByText('총 1,248건')).toBeTruthy();
    expect(screen.getByText('07/10 17:27:56')).toBeTruthy();
    expect(screen.getAllByText('회원 상세 조회').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MEMBER #1842').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin-1').length).toBeGreaterThan(0);
    expect(screen.getByText('페이지당 9건')).toBeTruthy();
    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 9 })));
    await waitFor(() => expect(auditLogApiMock.getLogDetail).toHaveBeenCalledWith('1001'));
  });

  it('passes the administrator filter and resets it', async () => {
    renderPage();
    const adminInput = await screen.findByLabelText('관리자 ID');
    fireEvent.change(adminInput, { target: { value: '7' } });

    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenLastCalledWith(expect.objectContaining({ adminId: 7 })));
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));

    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenLastCalledWith(expect.not.objectContaining({ adminId: expect.anything() })));
  });

  it('does not render the target type filter', async () => {
    renderPage();

    await screen.findByText('총 1,248건');

    expect(screen.queryByLabelText('대상 유형')).toBeNull();
    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenLastCalledWith(expect.not.objectContaining({ targetType: expect.anything() })));
  });

  it('moves to the selected page', async () => {
    resolveList([listItem], 1, 3);
    renderPage();

    await screen.findByText('총 1,248건');
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, size: 9 })));
  });

  it('keeps the list height when the page has fewer than nine logs', async () => {
    const { container } = renderPage();

    await screen.findByText('총 1,248건');

    expect(container.querySelectorAll('.auditOpsTableRow.placeholder')).toHaveLength(8);
  });

  it('reserves the detail notice space after detail loading finishes', async () => {
    const { container } = renderPage();

    await screen.findByText('총 1,248건');
    await waitFor(() => expect(auditLogApiMock.getLogDetail).toHaveBeenCalledWith('1001'));

    expect(container.querySelector('.auditOpsDetailNoticeSlot.placeholder')).toBeTruthy();
  });
});
