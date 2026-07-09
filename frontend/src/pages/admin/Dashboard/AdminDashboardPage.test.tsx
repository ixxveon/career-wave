/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSession } from '../../../api/admin/adminAuthApi';
import type { AdminDashboardSummary } from '../../../api/admin/dashboardApi';
import { ADMIN_DETAIL_ROLE } from '../../../constants/admin/adminRoleConstants';
import { ADMIN_ROUTE_PATHS } from '../../../constants/admin/adminRouteConstants';
import AdminDashboardPage from './AdminDashboardPage';

const navigateMock = vi.hoisted(() => vi.fn());
const dashboardApiMock = vi.hoisted(() => ({
  getSummary: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../../api/admin/dashboardApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin/dashboardApi')>(
    '../../../api/admin/dashboardApi',
  );

  return {
    ...actual,
    dashboardApi: dashboardApiMock,
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
      <AdminDashboardPage />
    </QueryClientProvider>,
  );
}

function apiResponse(data: AdminDashboardSummary) {
  return {
    data: {
      success: true,
      statusCode: 200,
      message: 'OK',
      data,
    },
  };
}

function createSummary(overrides: Partial<AdminDashboardSummary> = {}): AdminDashboardSummary {
  return {
    baseDateTime: '2026-06-28T09:00:00Z',
    kpis: [
      {
        key: 'TODAY_NEW_ADMINS',
        title: '오늘 신규 관리자',
        value: 7,
        unit: '명',
        deltaText: '선택 기간 기준',
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.admins,
      },
      {
        key: 'REALTIME_ACTIVE_ADMINS',
        title: '실시간 활성 관리자',
        value: 3,
        unit: '명',
        deltaText: '최근 로그인 1명 기준',
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.admins,
      },
      {
        key: 'AI_INTERVIEW_SESSIONS',
        title: 'AI 인터뷰 세션',
        value: 12,
        unit: '건',
        deltaText: '선택 기간 내 생성 세션 기준',
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.ai,
      },
      {
        key: 'TODAY_REVENUE',
        title: '오늘 매출',
        value: 29000,
        unit: '원',
        deltaText: '오늘 결제 승인 금액 기준',
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.payments,
      },
    ],
    alerts: [
      {
        id: 1,
        level: 'WARNING',
        domain: 'AUDIT_LOG',
        title: '감사 로그 경고',
        message: '권한 변경 경고',
        targetPath: ADMIN_ROUTE_PATHS.log,
        createdAt: '2026-06-28T08:55:00Z',
      },
      {
        id: 2,
        level: 'URGENT',
        domain: 'SCRAPING',
        title: '스크래핑 실패',
        message: '배치 스크래핑 실패',
        targetPath: ADMIN_ROUTE_PATHS.scraping,
        createdAt: '2026-06-28T08:58:00Z',
      },
    ],
    weeklySignups: [
      { label: '06/22', count: 2 },
      { label: '06/23', count: 5 },
    ],
    paymentRatio: [{ method: 'CARD', label: 'Toss Payments', ratio: 100 }],
    serviceCards: [
      {
        key: 'ADMIN',
        title: '관리자 관리',
        description: '관리자 계정과 권한을 관리합니다.',
        summaryText: '신규 7명',
        targetPath: ADMIN_ROUTE_PATHS.admins,
      },
      {
        key: 'SCRAPING',
        title: '스크래핑 관리',
        description: '채용 공고 수집 파이프라인 상태를 확인합니다.',
        summaryText: '실행 중 1개',
        targetPath: ADMIN_ROUTE_PATHS.scraping,
      },
      {
        key: 'AUDIT_LOG',
        title: '감사 로그',
        description: '관리자 활동과 시스템 변경 이력을 확인합니다.',
        summaryText: '알림 2건',
        targetPath: ADMIN_ROUTE_PATHS.log,
      },
    ],
    systemStatus: [
      {
        key: 'SCRAPING_PIPELINE',
        label: '스크래핑 파이프라인',
        status: 'WARNING',
        valueText: '실행 중 1개 / 실패 0개',
      },
    ],
    recentActivities: [
      {
        id: 100,
        occurredAt: '2026-06-28T08:50:00Z',
        adminId: 'master',
        message: '관리자 활동 - 권한 변경',
        targetPath: ADMIN_ROUTE_PATHS.log,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  adminSession.setRole(ADMIN_DETAIL_ROLE.MASTER);
  adminSession.setId('super_admin');
  adminSession.setName('Super Admin');
  dashboardApiMock.getSummary.mockResolvedValue(apiResponse(createSummary()));
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('AdminDashboardPage contract rendering', () => {
  it('renders dashboard summary using backend KPI keys and target paths', async () => {
    renderPage();

    expect(await screen.findByText('오늘 신규 관리자')).toBeTruthy();
    expect(screen.getByText('7명')).toBeTruthy();
    expect(screen.getByText('실시간 활성 관리자')).toBeTruthy();
    expect(screen.getByText('AI 인터뷰 세션')).toBeTruthy();
    expect(screen.getByText('29,000원')).toBeTruthy();
    expect(screen.getByText('Super Admin')).toBeTruthy();
    expect(screen.getByText('SA')).toBeTruthy();
    expect(screen.getByText('권한 변경 경고')).toBeTruthy();
    expect(screen.getByText('배치 스크래핑 실패')).toBeTruthy();
    expect(screen.getByText('Toss Payments')).toBeTruthy();
    expect(screen.getAllByText('Toss Payments 100%')).toHaveLength(2);
    expect(screen.getByText('관리자 활동 - 권한 변경')).toBeTruthy();
  });

  it('renders the logged-in admin profile using session name and id', async () => {
    adminSession.setRole(ADMIN_DETAIL_ROLE.CS);
    adminSession.setId('cs_manager');
    adminSession.setName('CS Manager');

    renderPage();

    expect(await screen.findByText('CS Manager')).toBeTruthy();
    expect(document.querySelector('.avatar')?.textContent).toBe('CM');
  });

  it('renders the recent activity all alerts button when the destination page is accessible', async () => {
    renderPage();

    expect(await screen.findByText('권한 변경 경고')).toBeTruthy();
    expect(screen.getByRole('button', { name: '전체 보기' })).toHaveProperty('disabled', false);
  });

  it('navigates through valid alert, service card, and recent activity target paths', async () => {
    const { container } = renderPage();

    expect(await screen.findByText('권한 변경 경고')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '상세 보기' })[0]);
    expect(navigateMock).toHaveBeenCalledWith(ADMIN_ROUTE_PATHS.log);

    const scrapingCard = screen.getByText('스크래핑 관리').closest('.serviceListRow');
    const scrapingButton = scrapingCard?.querySelector('button');
    expect(scrapingButton).toBeTruthy();
    fireEvent.click(scrapingButton as HTMLButtonElement);
    expect(navigateMock).toHaveBeenCalledWith(ADMIN_ROUTE_PATHS.scraping);

    const activityRow = container.querySelector('.logRow');
    expect(activityRow).toBeTruthy();
    fireEvent.click(activityRow as HTMLElement);
    expect(navigateMock).toHaveBeenCalledWith(ADMIN_ROUTE_PATHS.log);
  });

  it('filters restricted alert and service card domains for CS admins', async () => {
    adminSession.setRole(ADMIN_DETAIL_ROLE.CS);

    renderPage();

    expect(await screen.findByText('오늘 신규 관리자')).toBeTruthy();
    expect(screen.queryByText('권한 변경 경고')).toBeNull();
    expect(screen.queryByText('배치 스크래핑 실패')).toBeNull();
    expect(screen.queryByText('스크래핑 관리')).toBeNull();
    expect(screen.queryByText('감사 로그')).toBeNull();
    expect(screen.getByText('현재 처리할 주요 알림이 없습니다.')).toBeTruthy();
  });

  it('renders complete empty state when every dashboard section is empty', async () => {
    dashboardApiMock.getSummary.mockResolvedValueOnce(
      apiResponse(
        createSummary({
          kpis: [],
          alerts: [],
          weeklySignups: [],
          paymentRatio: [],
          serviceCards: [],
          systemStatus: [],
          recentActivities: [],
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('표시할 대시보드 데이터가 없습니다.')).toBeTruthy();
  });

  it('renders error state and retries the summary request', async () => {
    dashboardApiMock.getSummary
      .mockRejectedValueOnce(new Error('dashboard failed'))
      .mockResolvedValueOnce(apiResponse(createSummary()));

    renderPage();

    expect(await screen.findByText('대시보드 데이터를 불러오지 못했습니다.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() => expect(dashboardApiMock.getSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('오늘 신규 관리자')).toBeTruthy();
  });
});
