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
    data: { success: true, data: { content, page, size: 20, totalElements: 1248, totalPages } },
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

  it('passes the target type filter', async () => {
    renderPage();
    const targetTypeSelect = await screen.findByLabelText('대상 유형');
    fireEvent.change(targetTypeSelect, { target: { value: 'MEMBER' } });

    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenLastCalledWith(expect.objectContaining({ targetType: 'MEMBER' })));
  });

  it('moves to the selected page', async () => {
    resolveList([listItem], 1, 3);
    renderPage();

    await screen.findByText('총 1,248건');
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});
